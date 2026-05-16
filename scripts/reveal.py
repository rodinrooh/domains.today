import os

from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

result = (
    supabase.table("domains")
    .select("id")
    .eq("shown", False)
    .order("id", desc=False)
    .limit(60)
    .execute()
)

rows = result.data
if not rows:
    print("No hidden domains remaining.")
    exit(0)

ids = [r["id"] for r in rows]
print(f"Revealing IDs {ids[0]} to {ids[-1]} ({len(ids)} domains)")

supabase.table("domains").update({"shown": True}).in_("id", ids).execute()
print("Done.")
