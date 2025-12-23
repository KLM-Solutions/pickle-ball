# Environment Variables Configuration

## For Next.js (Vercel)

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RunPod Configuration
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=your-endpoint-id
```

### Where to get these values:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `RUNPOD_API_KEY` | RunPod Console → Settings → API Keys |
| `RUNPOD_ENDPOINT_ID` | RunPod Console → Serverless → Your Endpoint → ID (in URL) |

---

## For RunPod Worker (Set in RunPod Dashboard)

When creating/editing your RunPod Serverless endpoint, add these environment variables:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to get these values:

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Same as NEXT_PUBLIC_SUPABASE_URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → service_role secret |

⚠️ **IMPORTANT**: Never expose the `service_role` key in frontend code! It has full database access.

---

## Vercel Deployment

When deploying to Vercel:

1. Go to your Vercel project → Settings → Environment Variables
2. Add each variable listed above
3. Make sure to add them to **Production**, **Preview**, and **Development** as needed

