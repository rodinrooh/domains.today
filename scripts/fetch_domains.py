import argparse
import base64
import io
import os
import zipfile
from datetime import date, timedelta

import requests
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

parser = argparse.ArgumentParser()
parser.add_argument("--date", help="Date to fetch (YYYY-MM-DD). Defaults to today.")
args = parser.parse_args()

if args.date:
    target_date = date.fromisoformat(args.date)
    is_backfill = True
else:
    target_date = date.today()
    is_backfill = False

filename = target_date.strftime("%Y-%m-%d") + ".zip"
encoded = base64.b64encode(filename.encode()).decode()

url = f"https://www.whoisds.com//whois-database/newly-registered-domains/{encoded}/nrd"
print(f"Downloading: {url}")

response = requests.get(url, timeout=120)
response.raise_for_status()

domains = []
with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
    for name in zf.namelist():
        with zf.open(name) as f:
            for line in f:
                domain = line.decode("utf-8", errors="ignore").strip()
                if domain:
                    domains.append(domain)

print(f"Found {len(domains)} domains")

if not is_backfill:
    # Flip all unshown rows from previous days so only today's batch is in the reveal queue
    cutoff = target_date.isoformat()
    total_cleared = 0
    while True:
        batch = supabase.table("domains").select("id") \
            .eq("shown", False).lt("date_added", cutoff).limit(2000).execute()
        if not batch.data:
            break
        ids = [r["id"] for r in batch.data]
        supabase.table("domains").update({"shown": True}).in_("id", ids).execute()
        total_cleared += len(ids)
        print(f"Flipped {total_cleared} old unshown rows so far...")
    if total_cleared:
        print(f"Done flipping {total_cleared} old rows — only today's batch in queue now")

BATCH = 500
for i in range(0, len(domains), BATCH):
    batch = [
        {"domain": d, "date_added": target_date.isoformat(), "shown": False}
        for d in domains[i : i + BATCH]
    ]
    supabase.table("domains").upsert(
        batch, on_conflict="domain", ignore_duplicates=True
    ).execute()
    print(f"Upserted batch {i // BATCH + 1} ({len(batch)} rows)")

print("Done.")
