"use client";

import Link from "next/link";

export default function AboutPage() {
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

      <main className="flex-1 px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl sm:text-6xl font-light tracking-tight mb-8">About Pixmerce</h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl">
          We are redefining how e-commerce brands create, scale, and manage their visual assets using cutting-edge generative AI.
        </p>
      </main>

    </div>
  );
}
