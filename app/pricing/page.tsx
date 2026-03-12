"use client";

import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-[#3b82f6]/30">
      
      {/* Navbar (reused marketing header) */}
      <header className="sticky top-0 z-50 px-6 sm:px-12 h-20 flex items-center justify-between border-b border-white/[0.04] bg-[#020617]/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#3b82f6] to-[#1d4ed8]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Pixmerce<span className="text-[#3b82f6]">.ai</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</Link>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#60a5fa] text-black text-sm font-bold transition-all shadow-md hover:shadow-lg hover:shadow-[#3b82f6]/20">Try for free</Link>
        </div>
      </header>

      {/* Pricing Header */}
      <main className="flex-1 px-6 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-300 text-xs font-semibold mb-6 uppercase tracking-widest">Pricing</div>
          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-center mb-8">Simple, transparent pricing</h1>
          <div className="flex items-center gap-4 mb-20 text-sm font-medium">
            <span className="text-gray-400">Monthly</span>
            <div className="w-12 h-6 rounded-full bg-white/10 p-1 flex cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-[#3b82f6] shadow-sm ml-auto"></div>
            </div>
            <span className="text-white">Annually <span className="text-[#3b82f6] text-xs ml-1 bg-[#3b82f6]/10 px-2 py-0.5 rounded-full">Save 20%</span></span>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            
            {/* Free */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 flex flex-col">
              <h3 className="text-2xl font-light mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-light">$0</span>
                <span className="text-gray-500 font-light text-sm">Forever</span>
              </div>
              <Link href="/login" className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-center mt-auto transition-colors mb-8">Current Plan</Link>
              <div className="space-y-4 text-sm font-light text-gray-400">
                <p className="font-medium text-white mb-2 text-xs uppercase tracking-widest">Features</p>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 5 image credits</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 1 custom model</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> Basic templates</div>
                <div className="flex gap-3 text-gray-600"><span className="">-</span> Standard rendering speed</div>
              </div>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 flex flex-col relative">
              <h3 className="text-2xl font-light mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-light">$12</span>
                <span className="text-gray-500 font-light text-sm">/ month</span>
              </div>
              <Link href="/dashboard" className="w-full py-3 rounded-xl bg-[#3b82f6] hover:bg-[#60a5fa] text-black font-semibold text-center mt-auto transition-colors mb-8">Get Pro</Link>
              <div className="space-y-4 text-sm font-light text-gray-300">
                <p className="font-medium text-white mb-2 text-xs uppercase tracking-widest">Features</p>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 50 image credits</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> Fast rendering speed</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 5 custom brand models</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> Image upscaling</div>
              </div>
            </div>

            {/* Pro+ */}
            <div className="rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/[0.02] p-8 flex flex-col relative transform lg:-translate-y-4 shadow-[0_0_40px_rgba(132,204,22,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-[#3b82f6] text-black text-xs font-bold rounded-full uppercase tracking-widest">Most Popular</div>
              <h3 className="text-2xl font-light mb-2 text-white">Pro+</h3>
              <div className="flex items-baseline gap-1 mb-8 text-white">
                <span className="text-5xl font-light">$29</span>
                <span className="text-gray-500 font-light text-sm">/ month</span>
              </div>
              <Link href="/dashboard" className="w-full py-3 rounded-xl bg-transparent hover:bg-white/5 border border-[#3b82f6] text-[#3b82f6] font-semibold text-center mt-auto transition-colors mb-8">Get Pro+</Link>
              <div className="space-y-4 text-sm font-light text-gray-300">
                <p className="font-medium text-white mb-2 text-xs uppercase tracking-widest">Everything in Pro, plus</p>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 200 image credits</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> Priority rendering queue</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> 15 custom brand models</div>
                <div className="flex gap-3"><span className="text-[#3b82f6]">âœ“</span> Advanced API access</div>
              </div>
            </div>

            {/* Scale/Enterprise */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 flex flex-col">
              <h3 className="text-2xl font-light mb-2">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-light">Custom</span>
              </div>
              <Link href="/enterprise" className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-center mt-auto transition-colors mb-8">Contact Sales</Link>
              <div className="space-y-4 text-sm font-light text-gray-400">
                <p className="font-medium text-white mb-2 text-xs uppercase tracking-widest">For scale</p>
                <div className="flex gap-3"><span className="text-gray-500">âœ“</span> Unlimited credits</div>
                <div className="flex gap-3"><span className="text-gray-500">âœ“</span> Commercial licensing</div>
                <div className="flex gap-3"><span className="text-gray-500">âœ“</span> Unlimited API usage</div>
                <div className="flex gap-3"><span className="text-gray-500">âœ“</span> Dedicated account manager</div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer (Simplified for Pricing) */}
      <footer className="border-t border-white/[0.04] py-8 text-center text-sm font-light text-gray-600">
        Â© 2026 Pixmerce.ai
      </footer>
    </div>
  );
}
