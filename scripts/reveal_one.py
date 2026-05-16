import os
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
result = supabase.rpc("reveal_next_domain").execute()
if result.data:
    print(f"Revealed ID: {result.data}")
else:
    print("No domains remaining.")
