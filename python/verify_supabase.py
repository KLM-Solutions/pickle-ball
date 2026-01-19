
import os
import sys
from supabase import create_client, Client

# Load env vars manually for this test script
# (In a real app, python-dotenv would handle this, or they'd be set in the shell)
# For this verify script, we'll try to read .env.local if variables aren't set

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

# Try to load from parent dir
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
load_env_local(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

print(f"Testing Supabase Connection...")
print(f"URL: {url}")
print(f"Key: {key[:10]}..." if key else "Key: None")

if not url or not key:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    sys.exit(1)

try:
    supabase: Client = create_client(url, key)
    # Perform a simple read (e.g., from 'users' table or just check health if possible, 
    # but 'users' is usually a safe bet if RLS allows reading own user, or public tables)
    # Actually, a simple storage list or a trivial query is better.
    # Let's try to list buckets, which is a common authorized action if key is valid.
    
    print("Attempting to list storage buckets...")
    buckets = supabase.storage.list_buckets()
    print("✓ Success! Connected to Supabase.")
    print(f"Buckets found: {len(buckets)}")
    for b in buckets:
        print(f" - {b.name}")
        
except Exception as e:
    print(f"✗ ERROR: Connection failed: {e}")
    sys.exit(1)
