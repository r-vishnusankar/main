# Netlify Deployment Guide

## Prerequisites
1. A GitHub/GitLab/Bitbucket account
2. A Netlify account (sign up at https://netlify.com)

## Step 1: Push Your Code to Git

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a repository on GitHub/GitLab/Bitbucket

3. Push your code:
   ```bash
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings (Netlify should auto-detect Next.js):
   - **Build command:** `npm run build` (auto-detected)
   - **Publish directory:** `.next` (auto-detected)
   - **Node version:** 20 (set in netlify.toml)
   
   Note: Netlify will automatically detect Next.js and configure settings. The `netlify.toml` file handles this.

6. Add environment variables:
   - Go to Site settings → Environment variables
   - Add: `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY` or `NANOBANANA_API_KEY`
   - Value: Your API key from `.env.local`

7. Click "Deploy site"

### Option B: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize Netlify in your project:
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow the prompts

4. Set environment variables:
   ```bash
   netlify env:set GOOGLE_GEMINI_API_KEY "your-api-key-here"
   ```
   Or use:
   ```bash
   netlify env:set GEMINI_API_KEY "your-api-key-here"
   ```
   Or:
   ```bash
   netlify env:set NANOBANANA_API_KEY "your-api-key-here"
   ```

5. Deploy:
   ```bash
   netlify deploy --prod
   ```

## Step 3: Verify Deployment

1. After deployment, Netlify will provide a URL (e.g., `your-site.netlify.app`)
2. Visit the URL to verify your app is working
3. Test the image generation feature

## Important Notes

### Environment Variables
- **Never commit** `.env.local` to Git
- Add `.env.local` to `.gitignore` if not already there
- Set environment variables in Netlify dashboard under Site settings → Environment variables

### API Routes
- Your API routes (`/api/generate-image`) will work automatically on Netlify
- Make sure your API key is set as an environment variable

### Build Settings
- Netlify will automatically detect Next.js and use the correct build settings
- The `netlify.toml` file configures the build process

### Troubleshooting

**Build fails:**
- Check Node version (should be 20 or latest LTS)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

**API routes not working:**
- Verify environment variables are set correctly
- Check API route logs in Netlify Functions dashboard
- Ensure API key has correct permissions

**Images not loading:**
- Check CORS settings if using external image URLs
- Verify IndexedDB is working (should work in modern browsers)

## Continuous Deployment

Once connected to Git:
- Every push to `main` branch will trigger a new deployment
- Netlify will build and deploy automatically
- You can preview deployments from pull requests

## Custom Domain

1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions
