# Deployment Guide – Netlify & Render

Pixmerce supports **Netlify** and **Render**. The persistent scheduler uses **Upstash Redis** which works on both platforms.

**Production URL (Netlify):** https://pixmerce-ai.netlify.app/

---

## Step 0: Get Upstash Redis (Required for Scheduling)

1. Go to [upstash.com](https://upstash.com) → Create Account
2. Click **Create Database** → name it `pixmerce` → pick region closest to you → type: **Redis**
3. Open the database → click **REST API** tab
4. Copy the two values you'll need:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

> Free tier is enough. No credit card required.

---

## Deploying on Netlify

### Step 1: Push code to Git

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import existing project**
2. Connect GitHub/GitLab/Bitbucket and select your repo
3. Build settings are auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Click **Deploy site**

### Step 3: Set Environment Variables

Go to **Site Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | From Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash dashboard |
| `CRON_SECRET` | Any random string, e.g. `pixmerce_abc123xyz` |
| `GOOGLE_GEMINI_API_KEY` | Your Gemini API key |
| `META_PAGE_ID` | Meta Business Manager |
| `META_PAGE_ACCESS_TOKEN` | Meta Business Manager |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud API |
| `WHATSAPP_TO_PHONE` | e.g. `919876543210` |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth token |
| `LINKEDIN_PERSON_URN` | e.g. `urn:li:person:XXXXXXXX` |
| `SHOPIFY_STORE` | e.g. `mystore.myshopify.com` (optional) |
| `SHOPIFY_ACCESS_TOKEN` | Shopify admin API token (optional) |
| `SHOPIFY_BLOG_ID` | Shopify blog ID (optional) |

> Netlify automatically provides the `URL` env var for your site's production URL. No need to set it manually.

### Step 4: Cron – Auto-runs on Netlify

The file `netlify/functions/scheduled-publish.mts` is a **Netlify Scheduled Function** that runs every 15 minutes automatically. No extra setup needed — it's bundled with your deployment.

It calls your `/api/cron/publish-scheduled` endpoint which processes all due scheduled posts.

### Split deployment: Frontend on Netlify, Backend on Render

To host the Next.js frontend on Netlify and the API on Render:

1. **Deploy the full app to Render** (backend) – use `render.yaml` or create a web service. Render will run both pages and API routes. Note your Render URL (e.g. `https://pixmerce-app.onrender.com`).

2. **Deploy the full app to Netlify** (frontend) – Netlify will serve pages; API calls will be proxied to Render.

3. **Netlify env vars** – add:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://pixmerce-app.onrender.com`)

4. **Render env vars** – add (for CORS):
   - `CORS_ORIGINS` = your Netlify URL (e.g. `https://pixmerce-ai.netlify.app`)
   - Or `NEXT_PUBLIC_APP_URL` = same value

5. Redeploy both after setting env vars.

### Redeploy after adding env vars

After setting env vars, trigger a new deploy:

```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

---

## Deploying on Render

### Step 1: Use the render.yaml blueprint

The `render.yaml` file in your repo defines both the web service and the cron job.

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Render will create:
   - `pixmerce-app` – the Next.js web service
   - `pixmerce-publish-cron` – a cron job that runs every 15 minutes

### Step 2: Set Environment Variables

After blueprint creates the services, go to each service → **Environment** and fill in:

| Variable | Service |
|---|---|
| `UPSTASH_REDIS_REST_URL` | web + cron |
| `UPSTASH_REDIS_REST_TOKEN` | web + cron |
| `CRON_SECRET` | web + cron (same value) |
| `GOOGLE_GEMINI_API_KEY` | web |
| `META_PAGE_ID` | web |
| `META_PAGE_ACCESS_TOKEN` | web |
| `WHATSAPP_PHONE_NUMBER_ID` | web |
| `WHATSAPP_ACCESS_TOKEN` | web |
| `WHATSAPP_TO_PHONE` | web |
| `LINKEDIN_ACCESS_TOKEN` | web |
| `LINKEDIN_PERSON_URN` | web |

### Step 3: Update cron URL

In `render.yaml`, replace `YOUR_APP_URL` with your actual Render web service URL (e.g. `https://pixmerce-app.onrender.com`) and push.

---

## LinkedIn Setup

LinkedIn personal profile posting requires an approved LinkedIn Developer app.

1. Go to [linkedin.com/developers](https://www.linkedin.com/developers) → Create app
2. Add product: **Share on LinkedIn** (requires approval)
3. OAuth 2.0 → generate a token with scope `w_member_social`
4. Set `LINKEDIN_ACCESS_TOKEN` to that token
5. Get your Person URN:
   - Call `GET https://api.linkedin.com/v2/me` with your token
   - Copy the `id` field and format as `urn:li:person:YOUR_ID`
   - Set `LINKEDIN_PERSON_URN` to that value

> LinkedIn tokens expire in 60 days. You'll need to refresh them periodically.

---

## How Scheduled Publishing Works

```
User clicks "Schedule Post" → picks mode, platforms, date/time
→ POST /api/schedule → Upstash Redis (persists across all instances)
→ Cron runs every 15 min (Netlify function or Render cron)
→ GET /api/cron/publish-scheduled → reads due jobs from Redis
→ auto_generate jobs: Gemini generates image + caption + hashtags
→ doPublish() → Facebook, Instagram, WhatsApp, LinkedIn, Shopify
→ Job deleted from Redis, status updated to published
```

Failed jobs are retried up to 3 times, then marked as permanently failed with a reason shown in the UI.

---

## Troubleshooting

**Scheduled posts not publishing:**
- Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check that `CRON_SECRET` matches between web and cron services
- On Netlify: check Functions logs in the Netlify dashboard
- On Render: check the cron job logs in Render dashboard

**LinkedIn failing:**
- Token may have expired (60-day limit) – regenerate and update env var
- Ensure your LinkedIn app has `Share on LinkedIn` product approved

**Meta/WhatsApp failing:**
- Confirm page token is a long-lived token (not a short-lived one)
- Check Meta Graph API explorer for token validity
