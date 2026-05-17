"""
One-time catchup: marks all unshown domains from previous days as shown=true
in batches of 2000 to avoid statement timeouts.

Run with: python scripts/catchup.py --cutoff YYYY-MM-DD
The cutoff date is exclusive — everything before it gets cleared.
"""
import argparse
import os
from datetime import date

from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

parser = argparse.ArgumentParser()
parser.add_argument("--cutoff", default=date.today().isoformat(),
                    help="Clear unshown rows with date_added < this date (default: today)")
args = parser.parse_args()

cutoff = args.cutoff
print(f"Clearing unshown rows with date_added < {cutoff} ...")

total = 0
while True:
    batch = supabase.table("domains").select("id") \
        .eq("shown", False).lt("date_added", cutoff).limit(2000).execute()
    if not batch.data:
        break
    ids = [r["id"] for r in batch.data]
    supabase.table("domains").update({"shown": True}).in_("id", ids).execute()
    total += len(ids)
    print(f"  cleared {total} so far...")

print(f"Done. Total cleared: {total}")
