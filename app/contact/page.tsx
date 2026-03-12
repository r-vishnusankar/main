"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-[#3b82f6]/30">
      
      {/* Navbar */}
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

      <main className="flex-1 px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-4">Contact Sales & Support</h1>
        <p className="text-gray-400 font-light max-w-xl mb-12">
          Let us know how we can help you scale your brand visuals. You can also email us directly at <a href="mailto:hello@pixmerce.ai" className="text-[#3b82f6] hover:underline">hello@pixmerce.ai</a>
        </p>

        {submitted ? (
          <div className="p-8 rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/[0.02]">
            <h3 className="text-2xl font-light text-[#3b82f6] mb-2">Message Sent</h3>
            <p className="text-gray-400">Our team will get back to you within 24 hours.</p>
          </div>
        ) : (
          <form 
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
            className="w-full max-w-md text-left flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input type="text" required className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#3b82f6] transition-colors" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Company Email</label>
              <input type="email" required className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#3b82f6] transition-colors" placeholder="jane@brand.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">How can we help?</label>
              <textarea required rows={4} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#3b82f6] transition-colors resize-none" placeholder="I'm interested in..." />
            </div>
            <button type="submit" className="mt-4 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#60a5fa] text-black font-semibold transition-colors">Submit Request</button>
          </form>
        )}
      </main>

    </div>
  );
}
