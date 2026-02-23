# UI Improvement Plan — Product-grade, internationally standard

Goal: Fix alignment and card issues, improve Home and left nav, and make the app look like a shippable product (consistent, professional, not generic “AI” aesthetic).

---

## 1. Design system foundation (do first)

- **Spacing scale**: Use a single scale everywhere (e.g. 4, 8, 12, 16, 24, 32, 48 px) instead of mixed `p-4`, `p-6`, `p-8`, `mb-2`, `mb-4`, `mb-8`.
- **Content width**: Pick one approach for main content:
  - **Option A** (recommended): Full-bleed main area with internal max-width (e.g. `max-w-7xl`) and consistent horizontal padding (e.g. `px-6` or `px-8`) so content is not “centered in a box” but aligned to the layout grid.
  - **Option B**: Keep `mx-auto max-w-6xl` but use it consistently and add a clear visual frame (e.g. subtle background or border) so it feels intentional.
- **Card radii**: Standardize (e.g. `rounded-xl` for cards, `rounded-lg` for buttons/inputs) and use the same on all pages.
- **Primary action color**: Keep `#0066ff` but define a single “primary” token; use neutral grays for secondary actions so hierarchy is clear.
- **Typography**: One clear scale (e.g. page title, section title, body, caption) and consistent font (already system font; consider a single “display” or “heading” font for titles if you want a more product feel).

**Files to touch**: `app/globals.css` (CSS variables for spacing, radii, typography), then apply in components.

---

## 2. Image cards — consistent size and alignment

**Problems today**:
- **Gallery**: All cards use `aspect-video` (16:9) while images can be 1:1, 3:1, 4:1 → distortion or letterboxing; grid is `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` with no fixed card width → uneven heights if titles wrap.
- **Banners**: Cards use `aspect-video` for thumbnails; banner aspect ratios vary (16:9, 1:1, etc.) → inconsistent visual weight.
- **ContentPublishView (saved posts)**: Small fixed `w-20 h-20` image and dense text → looks cramped and misaligned.
- **TemplateGallery**: Horizontal scroll with fixed-width cards; different from other grids.

**Proposed approach**:

| Location | Change |
|----------|--------|
| **Gallery** | Use a **fixed card size** (e.g. min-width 200px, fixed height or fixed aspect container). Image area: respect item’s `aspectRatio` when known (e.g. 1:1, 16:9) so no stretch; use `object-contain` and a neutral background. Fallback: single aspect (e.g. 4:3) when ratio unknown. Ensure title/caption area has fixed height or line-clamp so all cards align. |
| **Banners** | Use the **banner’s actual aspect ratio** for the card thumbnail (e.g. `aspect-[16/9]`, `aspect-square` from ratio string) so 1:1 banners don’t get letterboxed in 16:9. Same card width in grid so rows align. |
| **Publish (saved posts)** | Replace tiny 20×20 with a proper **card**: e.g. image 120×120 or small aspect box, caption line-clamp-2, same card style as Banners/Gallery (border, padding, hover). Use a grid (e.g. 2 cols on small, 3 on large) for consistency. |
| **Templates** | Keep horizontal scroll; ensure each template card has **fixed width/height** and consistent padding so the strip is aligned. |

**Implementation**: Add a small util or shared component that maps aspect ratio string to Tailwind class (e.g. `16:9` → `aspect-video`) and use it in Gallery and Banners. Standardize card padding (e.g. `p-4`) and gap (e.g. `gap-4` or `gap-6`).

---

## 3. Home — layout and alignment

**Problems**: Content is `max-w-6xl mx-auto` with everything centered; feels like a single column in the middle of the screen.

**Proposed**:
- **Remove “centered box” feel**: Use full-width main area with **consistent left-aligned content** and a single max-width container (e.g. `max-w-5xl` or `max-w-6xl`) with **left padding aligned** to the rest of the app (e.g. same `pl-*` as other views). No `mx-auto` for the inner content if the rest of the app is left-aligned; or use `mx-auto` but with a clear grid so the main column aligns with sidebar + content.
- **Grid for action cards**: Keep 2-column grid on md+ but make card heights equal (e.g. `min-h-[200px]` or flex so description + CTA align at bottom). Use consistent spacing between cards.
- **Recent Activity**: Give it a clear place (e.g. right column on large screens, or full width below) and style it like the rest of the app (same card style, padding).
- **Visual hierarchy**: One clear headline; short subtext; then cards. Avoid “wall of same-sized cards” by using a slight visual anchor (e.g. one featured “Quick start” or first card with a bit more emphasis).

**File**: `components/HomeView.tsx`.

---

## 4. Left navigation — fully interactive and accessible

**Problems**: Buttons are basic; no focus ring, no keyboard indication, label might wrap (e.g. “Product banner” in a narrow area).

**Proposed**:
- **Interaction**: Visible **hover** (e.g. background + slight scale or border), **active** state (pressed), **focus-visible** ring (e.g. `focus-visible:ring-2 focus-visible:ring-[var(--accent)]`) so keyboard users see focus.
- **Active state**: Clear “current page” (e.g. left border or background + contrast) so it’s obvious which view is selected.
- **Labels**: Prefer **single line** (e.g. “Product” instead of “Product banner” if space is tight) or **tooltip-only** with icon; ensure text doesn’t wrap awkwardly (e.g. `whitespace-nowrap` or shorter labels).
- **Accessibility**: `aria-current="page"` on the active item, `role="navigation"`, and `aria-label="Main navigation"`. Ensure focus order is logical.
- **Optional**: Slight transition on hover/active (e.g. `transition-colors duration-150`) so it feels responsive.

**File**: `components/LeftSidebar.tsx`.

---

## 5. Page-by-page consistency (international / product feel)

Apply the same principles on every view so the app feels like one product:

| Page | Current issues | Changes |
|------|----------------|--------|
| **Home** | Centered, generic cards | See §3; align to layout, equal card heights, clear hierarchy. |
| **Create** | Mixed padding, long copy | Use layout padding; shorten helper text; consistent section spacing. |
| **Product banner** | Same as Create | Same max-width and padding as Create; section headings consistent. |
| **Banners** | Tabs + two grids | Same card system (§2); filters row aligned; consistent empty state. |
| **Gallery** | Card ratio and alignment | See §2; search/filters same style as Banners (one design pattern). |
| **Templates** | Different card style | Same border/radius/bg as other cards; fixed card size in scroll. |
| **Publish** | Dense form, small post cards | Section spacing like other pages; saved posts as proper cards (§2). |
| **Help** | Long single column | Consider two-column on large screens (nav + content) or accordions; same card style. |

**International / “not AI”**:
- **Language**: Avoid jargon; use clear, action-oriented labels (e.g. “Create image” not “Generate asset”). Keep strings in one place if you add i18n later.
- **Icons**: Prefer **icons + text** (or icon with aria-label). If keeping emoji, use sparingly and add `aria-hidden` where decorative.
- **Colors**: Use accent for primary actions only; secondary actions neutral. Avoid “everything blue.”
- **Empty states**: Every list/grid has a clear empty state (icon + one line of copy + optional CTA), not just “No items.”
- **Loading**: Where applicable, use a single loading pattern (e.g. skeleton cards or spinner) instead of blank space.

---

## 6. Implementation order

1. **Design tokens** in `globals.css` (spacing, radii, accent, optionally typography).
2. **Left sidebar** (§4): quick win, affects every page.
3. **Home** (§3): layout and alignment.
4. **Card system** (§2): shared aspect-ratio helper + Gallery cards, then Banners, then Publish saved posts, then Templates.
5. **Consistency pass** (§5): Apply same padding, headings, and empty/loading states across Create, Product banner, Banners, Gallery, Publish, Help.

---

## 7. Summary

- **Cards**: One predictable card pattern; image area respects aspect ratio; fixed or minimum sizes so grids align; same treatment in Gallery, Banners, and Publish.
- **Home**: Left-aligned (or clearly gridded) content, no “floating centered box”; equal card heights and clear hierarchy.
- **Left nav**: Clear hover, focus, and active states; accessible and keyboard-friendly; concise labels.
- **Overall**: One spacing/radius/color system, consistent layout width and padding, clear primary/secondary actions, and intentional empty/loading states so the app feels like a single, sellable product.
