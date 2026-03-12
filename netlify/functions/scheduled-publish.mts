/**
 * Netlify Scheduled Function – runs every 15 minutes.
 * Calls the Next.js cron endpoint to process due scheduled posts.
 *
 * Netlify automatically provides the URL env var for the production site.
 * CRON_SECRET must be set in Netlify Site Settings → Environment Variables.
 */

import type { Config } from "@netlify/functions";

export default async function handler() {
  const siteUrl =
    process.env.URL ||              // Netlify production URL (auto-set)
    process.env.DEPLOY_URL ||       // Netlify deploy preview URL
    process.env.NEXT_PUBLIC_SITE_URL; // manual fallback

  if (!siteUrl) {
    console.error("[scheduled-publish] No site URL found. Set URL or NEXT_PUBLIC_SITE_URL.");
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const endpoint = `${siteUrl.replace(/\/$/, "")}/api/cron/publish-scheduled`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log(`[scheduled-publish] Cron ran: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error("[scheduled-publish] Failed to call cron endpoint:", err);
  }
}

export const config: Config = {
  schedule: "*/15 * * * *",
};
