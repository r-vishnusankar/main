# Pixmerce CMS Improvement Plan

## Vision
Build Pixmerce into an AI-first Campaign CMS for e-commerce teams:
- Generate content and creatives quickly
- Run approval-driven workflows
- Publish reliably across channels
- Learn from performance and improve outcomes

## Current Strengths
- AI creation stack: text-to-image, image-to-image, multi-reference generation
- Asset and banner management with templates, filters, and favorites
- Scheduling and multi-channel publishing foundations
- Brand prompt controls and purpose-based presets

## Critical Gaps
- No multi-user authentication and role-based permissions
- Scheduling store is not persistent enough for production reliability
- No approval workflow or revision history
- Limited SEO/editorial controls
- No analytics and performance feedback loop

## Phased Roadmap

### Phase 1 - Stability and Security (2-4 weeks)
1. Add authentication and basic roles (Admin, Editor, Viewer)
2. Move scheduled jobs to persistent storage (DB/KV/Redis)
3. Protect API routes and add rate limiting
4. Add timezone-aware scheduling
5. Add audit logs for publish/schedule actions

### Phase 2 - CMS Workflow (4-8 weeks)
1. Introduce lifecycle states:
   - `draft`, `in_review`, `approved`, `scheduled`, `published`, `failed`
2. Add approval queues and reviewer comments
3. Add version history and rollback
4. Build calendar view for editorial and social scheduling
5. Add bulk actions (tag/delete/schedule/export)

### Phase 3 - Growth and Scale (8-12 weeks)
1. Move assets to cloud storage (S3/R2/Cloudinary + CDN)
2. Add channel connector abstraction for extensible publishing
3. Add analytics dashboard (performance and conversion insights)
4. Add A/B workflow for AI variations and winner selection
5. Expand brand kit (logo, colors, fonts, tone, guardrails)

## Product Feature Backlog (High Impact)
- Rich text editor for long-form content
- Reusable content blocks (CTA, product cards, promo sections)
- AI rewrite modes (tone, length, language)
- Smart asset tagging and duplicate detection
- Campaign entity with goals, channels, and reporting
- Channel pre-flight validation before publish
- Retry queue for publish failures
- SEO fields: meta title, meta description, OG image, canonical

## Technical Architecture Direction

### Data Model Targets
- `users`, `workspaces`, `roles`
- `assets`, `banners`, `posts`, `schedules`
- `approvals`, `revisions`, `audit_logs`
- `channel_accounts`, `publish_jobs`, `job_runs`

### Platform Priorities
- Server DB as source of truth (IndexedDB as optional offline cache)
- Background workers for generation/publishing jobs
- Observability (job metrics, error alerts, logs)
- Connector layer for channels (Meta, WhatsApp, Shopify, future)

## Immediate Next Actions
1. Define DB schema and migration plan
2. Implement persistent schedule store
3. Add auth + role middleware on APIs
4. Introduce post status workflow in UI and API
5. Add approval screen and revision tracking

## Success Metrics
- Publish success rate
- On-time schedule execution rate
- Average time from draft to publish
- Reuse rate of templates/assets
- Engagement lift from AI-generated variants
