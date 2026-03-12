"use client";

import Link from "next/link";
import PreviewImage from "@/components/PreviewImage";

export default function EnterprisePage() {
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
          <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#60a5fa] text-black text-sm font-bold transition-all shadow-md hover:shadow-lg hover:shadow-[#3b82f6]/20">Book a Demo</Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl sm:text-6xl font-light tracking-tight mb-8">Teams and Enterprise</h1>
        <button className="px-8 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#60a5fa] text-black font-semibold transition-colors mb-20 shadow-[0_0_30px_rgba(132,204,22,0.3)]">Book a Demo</button>
        
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            <div className="flex flex-col justify-center">
              <span className="text-[#3b82f6] text-xs font-semibold uppercase tracking-widest mb-4">Data Ownership and Security</span>
              <h2 className="text-3xl font-light mb-6 leading-tight">Your data, your models, your catalog.</h2>
              <p className="text-gray-400 font-light leading-relaxed">
                Pixmerce employs industry-leading encryption for all catalog data. Additionally, you retain full ownership and copyright of any designs or product photography generated on our platform. Scale securely.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] relative aspect-square overflow-hidden shadow-2xl">
               <PreviewImage slot="enterprise-security" alt="Enterprise Security" className="w-full h-full" />
            </div>
        </div>
      </main>

    </div>
  );
}
