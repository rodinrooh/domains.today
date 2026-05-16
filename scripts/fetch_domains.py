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

yesterday = date.today() - timedelta(days=1)
filename = yesterday.strftime("%Y-%m-%d") + ".zip"
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

today = date.today().isoformat()
BATCH = 500
for i in range(0, len(domains), BATCH):
    batch = [
        {"domain": d, "date_added": today, "shown": False}
        for d in domains[i : i + BATCH]
    ]
    supabase.table("domains").upsert(
        batch, on_conflict="domain", ignore_duplicates=True
    ).execute()
    print(f"Upserted batch {i // BATCH + 1} ({len(batch)} rows)")

print("Done.")
