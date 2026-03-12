"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PreviewImage from "@/components/PreviewImage";
import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

/* ── Icons ──────────────────────────────────────────────── */
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconTemplate() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/* ── Animated Hero left-side ── */
function AnimatedHeroContent() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ["stunning", "amazing", "beautiful", "smart", "branded"], []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleNumber((n) => (n === titles.length - 1 ? 0 : n + 1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [titleNumber, titles]);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* Badge */}
      <div>
        <span className="inline-flex items-center gap-2 text-[13px] px-4 py-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold cursor-pointer hover:bg-[var(--accent)]/20 transition-colors">
          AI-powered for e-commerce <IconArrow />
        </span>
      </div>
      {/* Headline */}
      <div className="flex flex-col gap-3">
        <h1 className="text-[3rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-black text-white leading-[1.08] tracking-tight">
          Turn product images
          <br />
          into{" "}
          <span className="relative inline-block min-w-[160px] sm:min-w-[200px] min-h-[1.2em] align-baseline overflow-hidden">
            {titles.map((title, index) => (
              <motion.span
                key={index}
                className="absolute left-0 top-0 font-semibold text-[var(--accent)] whitespace-nowrap"
                initial={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                animate={
                  titleNumber === index
                    ? { y: 0, opacity: 1 }
                    : { y: titleNumber > index ? -20 : 20, opacity: 0 }
                }
              >
                {title}
              </motion.span>
            ))}
          </span>{" "}
          banners
          <br />
          in seconds
        </h1>
        <p className="text-gray-400 text-[17px] sm:text-[18px] leading-relaxed max-w-[520px]">
          Upload a product image, pick a purpose — homepage banner, product card, Instagram post, sale promo — and let AI create pixel-perfect visuals for every platform.
        </p>
      </div>
      {/* CTAs */}
      <div className="flex flex-wrap gap-4">
        <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
          <button className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[16px] font-bold px-8 py-4 rounded-xl transition-colors shadow-[0_0_24px_var(--accent)/40]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Start Creating Free
          </button>
        </SignUpButton>
        <Link href="/dashboard" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 text-[16px] font-semibold px-8 py-4 rounded-xl transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Browse Templates
        </Link>
      </div>
      {/* Trust badges */}
      <div className="flex flex-wrap items-center gap-5">
        {["Homepage banners", "Instagram posts", "Product cards", "Sale promos"].map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[14px] text-gray-500">
            <IconCheck />{t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Banner overlay ── */
function BannerOverlay({ title, subtitle, cta = "Shop Now" }: { title: string; subtitle?: string; cta?: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
      {subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{subtitle}</p>}
      <p className="text-[15px] font-black text-white leading-tight drop-shadow">{title}</p>
      <div className="mt-3">
        <span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold text-black inline-block">{cta} →</span>
      </div>
    </div>
  );
}

/* ── "How it Works" UI Mockups ── */
function StepUploadMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0e0e14]">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a26] border-b border-white/[0.06]">
        {["#ff5f57","#febc2e","#28c840"].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}} />)}
        <div className="flex-1 mx-3 h-5 rounded-md bg-white/[0.06] flex items-center px-2">
          <span className="text-[10px] text-gray-600">pixmerce.ai/create</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">Select purpose</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {["Homepage Banner","Product Card","Instagram Post","Sale Promo"].map((t,i) => (
            <span key={t} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${i===0?"bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)]":"bg-white/[0.04] border-white/[0.08] text-gray-500"}`}>{t}</span>
          ))}
        </div>
        <div className="rounded-xl overflow-hidden mb-3 relative" style={{height:90}}>
          <PreviewImage slot="step-1" alt="Upload step" className="w-full h-full" />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/80 flex items-center justify-center text-white"><IconUpload /></div>
            <p className="text-[10px] text-white/70 font-medium">Drop product image here</p>
          </div>
        </div>
        <div className="h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center px-2">
          <span className="text-[10px] text-gray-600">Aspect ratio: 16:9 ▾</span>
        </div>
      </div>
    </div>
  );
}

function StepPromptMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0e0e14]">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a26] border-b border-white/[0.06]">
        {["#ff5f57","#febc2e","#28c840"].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}} />)}
        <div className="flex-1 mx-3 h-5 rounded-md bg-white/[0.06]" />
      </div>
      <div className="p-4">
        <div className="w-full rounded-lg mb-3 overflow-hidden relative" style={{height:80}}>
          <PreviewImage slot="step-2" alt="Template step" className="w-full h-full" />
          <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-black/60 text-white/60 px-1.5 py-0.5 rounded font-medium">product.jpg ✓</span>
        </div>
        <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide font-semibold">Template</p>
        <div className="flex gap-1.5 mb-3 overflow-hidden">
          {["Hero Banner","Product Card","Story"].map((t,i) => (
            <div key={t} className={`flex-shrink-0 px-2 py-1.5 rounded-lg border text-[9px] font-medium ${i===0?"border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]":"border-white/[0.08] text-gray-600"}`}>{t}</div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Prompt</p>
        <div className="rounded-lg border border-white/[0.1] bg-white/[0.03] p-2.5 mb-3">
          <p className="text-[10px] text-gray-400 leading-relaxed">E-commerce homepage hero banner, clean modern style, vibrant colors, strong CTA…</p>
        </div>
        <div className="h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center gap-1">
          <span className="text-[10px] font-bold text-white">✦ Generate</span>
        </div>
      </div>
    </div>
  );
}

function StepOutputMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0e0e14]">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a26] border-b border-white/[0.06]">
        {["#ff5f57","#febc2e","#28c840"].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}} />)}
        <div className="flex-1 mx-3 h-5 rounded-md bg-white/[0.06]" />
      </div>
      <div className="p-4">
        <div className="w-full rounded-xl mb-3 overflow-hidden relative" style={{height:100}}>
          <PreviewImage slot="step-3" alt="Generated output" className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent flex flex-col justify-center pl-3">
            <p className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5">New Arrival</p>
            <p className="text-[13px] font-black text-white leading-tight">Summer Collection</p>
            <span className="mt-1.5 px-2 py-0.5 bg-white text-black text-[8px] font-bold rounded-full w-fit">Shop Now →</span>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><span className="text-[9px] text-gray-400">↓ Download</span></div>
          <div className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><span className="text-[9px] text-gray-400">✎ Edit</span></div>
          <div className="flex-1 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center"><span className="text-[9px] font-bold text-white">↑ Publish</span></div>
        </div>
        <div className="flex gap-1.5">
          {["Facebook","Instagram","WhatsApp"].map(p => (
            <span key={p} className="flex-1 text-center py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[9px] text-gray-500">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-slate-100 font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/[0.06]"
        style={{ background: "var(--topbar-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-btn)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <span className="text-[16px] font-bold text-white tracking-tight">Pixmerce<span className="text-gradient font-black">.ai</span></span>
        </div>
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-gray-400">
          <Link href="#formats" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link>
        </nav>
        {/* Auth */}
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-[14px] font-medium text-gray-300 hover:text-white transition-colors hidden md:block">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="btn-primary text-[13px] px-5 py-2 h-9">Sign up free</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="btn-primary text-[13px] px-5 py-2 h-9">Open App</Link>
            <UserButton />
          </Show>
        </div>
      </header>

      <main className="pt-14">

        {/* ══ HERO — left text + right image grid ══ */}
        <section className="px-8 pt-14 pb-16">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center w-full max-w-[1400px] mx-auto">
            {/* Left: animated text */}
            <div className="flex-1 min-w-0">
              <AnimatedHeroContent />
            </div>
            {/* Right: image grid */}
            <div className="flex-shrink-0 w-full lg:w-[46%] xl:w-[48%]">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <PreviewImage slot="hero-main" alt="Homepage banner example" className="w-full aspect-video rounded-2xl"
                    overlay={<BannerOverlay title="Summer Sale — Up to 60% Off" subtitle="Homepage Banner · 16:9" cta="Shop Now" />}
                  />
                </div>
                <PreviewImage slot="hero-square-1" alt="Instagram post example" className="aspect-square w-full rounded-2xl"
                  overlay={
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                      <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Instagram · 1:1</p>
                      <p className="text-[13px] font-black text-white">New Drop ✦</p>
                    </div>
                  }
                />
                <PreviewImage slot="hero-portrait-1" alt="Product card example" className="w-full rounded-2xl" style={{ aspectRatio: "3/4" }}
                  overlay={
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-[9px] text-white/50 uppercase tracking-widest font-semibold mb-0.5">Product Card · 3:4</p>
                      <p className="text-[13px] font-black text-white">₹2,499</p>
                      <div className="mt-1.5 py-1 rounded-lg bg-white/90 text-center text-[10px] font-bold text-black">Add to Cart</div>
                    </div>
                  }
                />
              </div>
              <p className="text-center text-[12px] text-gray-600 mt-3">AI-generated outputs — yours will be unique</p>
            </div>
          </div>
        </section>

        {/* ══ CONTENT FORMAT GRID ══ */}
        <section id="formats" className="px-8 py-16 max-w-[1400px] mx-auto">
          <div className="mb-8">
            <p className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-widest mb-2">Create for any purpose</p>
            <h2 className="text-[26px] sm:text-[30px] font-black text-white tracking-tight leading-tight">
              Every content format your<br className="hidden sm:block" /> e-commerce team needs
            </h2>
            <p className="text-gray-500 text-[14px] mt-2">Drop your image into any format — AI handles the rest.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[
              { href: "/dashboard?view=create", slot: "homepage-banner", label: "Homepage Banner", desc: "Wide hero banners that drive traffic.", ratio: "16:9", aspectStyle: { aspectRatio: "16/9" }, overlayTitle: "New Season Collection", overlaySub: "Shop the latest looks" },
              { href: "/dashboard?view=create", slot: "product-card",    label: "Product Card",    desc: "Highlight products with clean cards.",  ratio: "3:4",  aspectStyle: { aspectRatio: "3/4"  }, overlayTitle: "Premium Quality",       overlaySub: "₹2,499 · Free shipping" },
              { href: "/dashboard?view=create", slot: "instagram-post",  label: "Instagram Post",  desc: "Eye-catching square posts for feed.",  ratio: "1:1",  aspectStyle: { aspectRatio: "1/1"  }, overlayTitle: "New Drop ✦",             overlaySub: "Shop via link in bio" },
              { href: "/dashboard?view=create", slot: "sale-promo",      label: "Sale Promo",      desc: "Bold banners built to drive urgency.", ratio: "16:9", aspectStyle: { aspectRatio: "16/9" }, overlayTitle: "Flash Sale — 70% Off",  overlaySub: "24 hours only" },
              { href: "/dashboard?view=create", slot: "email-header",    label: "Email Header",    desc: "Branded headers for campaigns.",       ratio: "3:1",  aspectStyle: { aspectRatio: "3/1"  }, overlayTitle: "Exclusive Member Offer", overlaySub: "For subscribers only" },
              { href: "/dashboard?view=create", slot: "festival",        label: "Festival / Event", desc: "Themed seasonal creatives.",          ratio: "1:1",  aspectStyle: { aspectRatio: "1/1"  }, overlayTitle: "Diwali Sale 🪔",         overlaySub: "Celebrate with savings" },
              { href: "/dashboard?view=templates", slot: "product-banner", label: "Product Banner", desc: "Combine product image with AI backgrounds.", ratio: "16:9", aspectStyle: { aspectRatio: "16/9" }, overlayTitle: "Crafted to Perfection", overlaySub: "Premium collection" },
              { href: "/dashboard?view=content-publish", slot: "social-caption", label: "Social Caption & Blog", desc: "AI drafts captions, alt-text & blog copy.", ratio: "", aspectStyle: { aspectRatio: "1/1" }, overlayTitle: "AI-written caption ready", overlaySub: "Publish in one click" },
            ].map((item) => (
              <Link key={item.slot} href={item.href}
                className="group text-left rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden">
                <div className="relative overflow-hidden" style={item.aspectStyle}>
                  <PreviewImage slot={item.slot} alt={item.label} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[10px] text-white/50 font-semibold mb-0.5">{item.overlaySub}</p>
                    <p className="text-[13px] font-black text-white leading-tight">{item.overlayTitle}</p>
                    <span className="mt-2 px-2.5 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-black inline-block">Shop Now →</span>
                  </div>
                  {item.ratio && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-mono text-white/60 backdrop-blur-sm">{item.ratio}</span>
                  )}
                  <div className="absolute inset-0 bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-4 py-2 rounded-xl bg-white/90 text-black text-[12px] font-bold flex items-center gap-1.5 shadow-lg">Create this <IconArrow /></span>
                  </div>
                </div>
                <div className="px-3.5 py-3">
                  <p className="text-[13px] font-bold text-white mb-0.5">{item.label}</p>
                  <p className="text-[11px] text-gray-500 leading-snug">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section id="how" className="px-8 py-16 max-w-[1400px] mx-auto">
          <div className="mb-10 text-center">
            <p className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-widest mb-2">Simple 3-step workflow</p>
            <h2 className="text-[26px] sm:text-[30px] font-black text-white tracking-tight">How it works</h2>
            <p className="text-gray-500 text-[15px] mt-2">From product image to published banner in under a minute</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Upload your product & choose a purpose", desc: "Drop in your product image and pick what you're creating — homepage banner, product card, Instagram post, or sale promo. The right aspect ratio and a pre-filled prompt are set automatically.", cta: "Go to Create", href: "/dashboard?view=create", visual: <StepUploadMockup />, accentColor: "text-[var(--accent)]", borderColor: "border-[var(--accent)]/30", bgColor: "bg-[var(--accent)]/5" },
              { num: "02", title: "Pick a template & edit the prompt", desc: "Choose from professional e-commerce templates or your own custom ones. The prompt is pre-filled based on your purpose — edit it to match your brand voice, campaign, or seasonal event.", cta: "Browse Templates", href: "/dashboard?view=templates", visual: <StepPromptMockup />, accentColor: "text-purple-400", borderColor: "border-purple-500/30", bgColor: "bg-purple-500/5" },
              { num: "03", title: "Generate, edit & publish to platforms", desc: "AI generates your banner instantly. Review it in the editor, make tweaks, then download or publish directly to Facebook, Instagram, or WhatsApp — with optional IST scheduling.", cta: "Go to Publish", href: "/dashboard?view=content-publish", visual: <StepOutputMockup />, accentColor: "text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/5" },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="p-4 pb-0">{step.visual}</div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full border ${step.borderColor} ${step.bgColor} flex items-center justify-center text-[12px] font-black ${step.accentColor}`}>{step.num}</span>
                    <div className="h-px flex-1 border-t border-white/[0.06]" />
                  </div>
                  <p className="text-[14px] font-bold text-white mb-2 leading-snug">{step.title}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{step.desc}</p>
                  <Link href={step.href} className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${step.accentColor} hover:underline`}>
                    {step.cta} <IconArrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ TEMPLATES SECTION ══ */}
        <section className="px-8 py-12 max-w-[1400px] mx-auto">
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{background:"linear-gradient(120deg,#0a0f1e 0%,#0e1b38 50%,#0a0f1e 100%)"}}>
            <div className="flex flex-col lg:flex-row items-center gap-8 p-8">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-widest mb-3">Templates</p>
                <h3 className="text-[22px] sm:text-[26px] font-black text-white leading-tight mb-3">
                  Use built-in templates<br />or create your own
                </h3>
                <p className="text-gray-400 text-[14px] leading-relaxed mb-6 max-w-md">
                  Choose from professionally designed e-commerce templates for every platform and format. Or save your own brand-specific templates with a custom prompt and aspect ratio — reusable by your entire content team.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard?view=templates" className="btn-primary text-[14px] px-6 py-2.5 flex items-center gap-2">
                    <IconTemplate /> Browse Templates
                  </Link>
                  <Link href="/dashboard?view=templates" className="btn-secondary text-[14px] px-6 py-2.5">
                    + Create Custom Template
                  </Link>
                </div>
              </div>
              <div className="flex-shrink-0 w-full lg:w-[40%]">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {slot:"homepage-banner", label:"Homepage Hero", ar:"16:9"},
                    {slot:"instagram-post",  label:"Instagram",     ar:"1:1"},
                    {slot:"product-card",    label:"Product Card",  ar:"3:4"},
                    {slot:"sale-promo",      label:"Sale Strip",    ar:"16:9"},
                    {slot:"festival",        label:"Festival",      ar:"1:1"},
                    {slot:"",               label:"+ Custom",       ar:"any", custom:true},
                  ].map((t) => (
                    t.custom ? (
                      <Link key="custom" href="/dashboard?view=templates"
                        className="aspect-square rounded-xl border-2 border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5 flex flex-col items-center justify-center hover:border-[var(--accent)]/60 transition-colors">
                        <p className="text-[20px] text-[var(--accent)]/50">+</p>
                        <p className="text-[9px] text-[var(--accent)] font-bold">Custom</p>
                      </Link>
                    ) : (
                      <div key={t.slot} className="relative aspect-square rounded-xl overflow-hidden">
                        <PreviewImage slot={t.slot} alt={t.label} className="w-full h-full" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-1.5">
                          <p className="text-[9px] font-bold text-white/90 leading-tight">{t.label}</p>
                          <p className="text-[8px] text-white/40 font-mono">{t.ar}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ PUBLISH EVERYWHERE ══ */}
        <section className="px-8 py-12 max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-purple-400 uppercase tracking-widest mb-3">Multi-platform publishing</p>
              <h3 className="text-[22px] sm:text-[26px] font-black text-white leading-tight mb-3">
                Create once.<br />Publish everywhere.
              </h3>
              <p className="text-gray-400 text-[14px] leading-relaxed mb-6 max-w-lg">
                Upload or generate an image, and AI drafts your social caption, alt text, and blog description. Schedule posts in IST and publish directly to Facebook, Instagram, and WhatsApp — no third-party tools needed.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  {icon:"f",  label:"Facebook",  color:"#1877f2"},
                  {icon:"ig", label:"Instagram", color:"#e1306c"},
                  {icon:"w",  label:"WhatsApp",  color:"#25d366"},
                ].map(p => (
                  <div key={p.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{background:p.color}}>{p.icon}</span>
                    <span className="text-[13px] font-semibold text-gray-300">{p.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard?view=content-publish" className="btn-primary text-[14px] px-6 py-2.5 flex items-center gap-2 w-fit">
                <IconSend /> Go to Publish
              </Link>
            </div>
            <div className="flex-shrink-0 w-full lg:w-[36%]">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0e0e14] overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a26] border-b border-white/[0.06]">
                  {["#ff5f57","#febc2e","#28c840"].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}} />)}
                  <span className="ml-2 text-[10px] text-gray-600">Schedule post</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="w-full rounded-xl overflow-hidden relative" style={{height:110}}>
                    <PreviewImage slot="homepage-banner" alt="Post preview" className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center pl-3">
                      <p className="text-[10px] text-white/50 mb-0.5">Preview</p>
                      <p className="text-[13px] font-black text-white">Summer Sale ✦</p>
                      <span className="mt-1 px-2 py-0.5 bg-white text-black text-[9px] font-bold rounded-full w-fit">Shop Now →</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 flex items-center gap-2">
                      <span className="text-gray-500"><IconCalendar /></span>
                      <span className="text-[10px] text-gray-500">Saturday, Feb 22, 2025</span>
                    </div>
                    <div className="h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 flex items-center gap-2">
                      <span className="text-gray-500 text-[11px]">⏰</span>
                      <span className="text-[10px] text-gray-500">10:00 AM IST</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {["Facebook","Instagram","WhatsApp"].map(p => (
                      <div key={p} className="flex-1 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-center text-[9px] font-medium text-[var(--accent)]">{p}</div>
                    ))}
                  </div>
                  <div className="w-full py-2 rounded-xl bg-[var(--accent)] text-center text-[11px] font-bold text-white">Schedule Post</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA FOOTER ══ */}
        <section className="px-8 py-14 max-w-[1400px] mx-auto">
          <div className="rounded-2xl p-10 text-center relative overflow-hidden" style={{background:"linear-gradient(120deg,#0d1b3e 0%,#1a2a6c 50%,#0d1b3e 100%)"}}>
            <div className="absolute inset-0 opacity-5">
              <PreviewImage slot="hero-main" alt="" className="w-full h-full" style={{objectFit:"cover"}} />
            </div>
            <div className="relative z-10">
              <h2 className="text-[24px] sm:text-[30px] font-black text-white mb-3 tracking-tight">Ready to transform your content workflow?</h2>
              <p className="text-gray-400 text-[15px] mb-8 max-w-lg mx-auto">Join e-commerce teams using Pixmerce.ai to create, schedule, and publish high-converting content in seconds.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="btn-primary text-[15px] px-8 py-3.5 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Start Creating Now
                  </button>
                </SignUpButton>
                <Link href="/dashboard?view=templates" className="btn-secondary text-[15px] px-8 py-3.5">
                  Explore Templates
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] bg-[#04070d] pt-14 pb-10 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg" style={{background:"var(--gradient-btn)"}}></div>
              <span className="text-[16px] font-black text-white">Pixmerce<span className="text-gradient">.ai</span></span>
            </div>
            <p className="text-[13px] text-gray-500 max-w-xs leading-relaxed">The AI content engine for e-commerce teams.</p>
          </div>
          <div className="flex flex-wrap gap-12">
            {[
              { title: "Product", links: [{ label: "AI Generator", href: "/dashboard" }, { label: "Templates", href: "/dashboard?view=templates" }, { label: "Publisher", href: "/dashboard?view=content-publish" }, { label: "Pricing", href: "/pricing" }] },
              { title: "Company", links: [{ label: "Enterprise", href: "/enterprise" }, { label: "Contact", href: "/contact" }] },
              { title: "Legal", links: [{ label: "Privacy", href: "#" }, { label: "Terms", href: "#" }] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-[12px] font-bold text-white mb-4 uppercase tracking-wider">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.label}><Link href={l.href} className="text-[13px] text-gray-500 hover:text-[var(--accent)] transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto border-t border-white/[0.06] pt-8">
          <p className="text-[12px] text-gray-600">© 2026 Pixmerce Inc. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
