
import os
import sys
from supabase import create_client, Client

# Manually load env vars for this script (same as verify_supabase.py)
def load_env_local(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
load_env_local(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)

# The User ID from the error log
MISSING_USER_ID = "user_38KZyTimxKojfOKHiTjWvhgtmZc"

print(f"Checking for user: {MISSING_USER_ID}")

try:
    # Check if user exists
    response = supabase.table("users").select("*").eq("id", MISSING_USER_ID).execute()
    
    if len(response.data) > 0:
        print(f"✅ User {MISSING_USER_ID} ALREADY EXISTS in 'users' table.")
    else:
        print(f"❌ User {MISSING_USER_ID} NOT FOUND in 'users' table.")
        print("Attempting to create mock user...")
        
        # Insert mock user to fix the FK error
        new_user = {
            "id": MISSING_USER_ID,
            "email": "local_dev_user@example.com",
            # Add other required fields if your schema enforces them, e.g. first_name, created_at
            # Assuming minimal schema for now
        }
        
        res = supabase.table("users").insert(new_user).execute()
        print(f"✅ Successfully inserted user {MISSING_USER_ID}.")
        print("You can now run the analysis again!")

except Exception as e:
    print(f"ERROR: {e}")
