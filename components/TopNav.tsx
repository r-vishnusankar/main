"use client";

import { useState, useRef, useEffect } from "react";
import { ActivityDropdown } from "@/components/ui/activity-dropdown";
import { Show, UserButton, SignInButton, useUser } from "@clerk/nextjs";

interface TopNavProps {
  onToggleRecent?: () => void;
  recentOpen?: boolean;
  onOpenCreate?: () => void;
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function TopNav({ onToggleRecent, recentOpen, onOpenCreate }: TopNavProps) {
  const isPureHome = !!onOpenCreate;
  const [activityOpen, setActivityOpen] = useState(false);
  const activityRef = useRef<HTMLDivElement>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isPureHome && isLoaded && isSignedIn) {
      fetch("/api/user/credits")
        .then(res => res.json())
        .then(data => {
          if (typeof data.credits === "number") setCredits(data.credits);
        });
    }
  }, [isPureHome, isLoaded, isSignedIn]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) {
        setActivityOpen(false);
      }
    }
    if (activityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activityOpen]);

  return (
    <header
      className="relative h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/[0.06]"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2 select-none flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--gradient-btn)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="text-[16px] font-bold text-white tracking-tight leading-none">
          Pixmerce<span className="text-gradient font-black">.ai</span>
        </span>
      </div>

      {/* Center: Nav links (pure home mode only) */}
      {isPureHome && (
        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <button type="button" className="flex items-center gap-1 text-[14px] font-medium text-gray-300 hover:text-white transition-colors">
            Features
            <IconChevronDown />
          </button>
          <button type="button" className="text-[14px] font-medium text-gray-300 hover:text-white transition-colors">
            Pricing
          </button>
          <button type="button" className="text-[14px] font-medium text-gray-300 hover:text-white transition-colors">
            Enterprise
          </button>
          <button type="button" className="text-[14px] font-medium text-gray-300 hover:text-white transition-colors">
            Community Gallery
          </button>
          <button type="button" className="flex items-center gap-1 text-[14px] font-medium text-gray-300 hover:text-white transition-colors">
            Resources
            <IconChevronDown />
          </button>
        </nav>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Search */}
        <button
          type="button"
          className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.07] transition-colors"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Notifications / Activity dropdown */}
        <div className="relative" ref={activityRef}>
          <button
            type="button"
            onClick={() => setActivityOpen(!activityOpen)}
            aria-label="Notifications"
            aria-expanded={activityOpen}
            className={`p-2.5 rounded-lg transition-colors ${
              activityOpen ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          {activityOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-[min(400px,90vw)]">
              <ActivityDropdown />
            </div>
          )}
        </div>

        {/* Recent banners toggle (app mode only) */}
        {onToggleRecent && (
          <button
            type="button"
            onClick={onToggleRecent}
            aria-label={recentOpen ? "Hide recent banners" : "Show recent banners"}
            className={`p-2.5 rounded-lg transition-colors ${
              recentOpen
                ? "text-[var(--accent)] bg-[var(--accent)]/10"
                : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Primary CTA: "Try our AI for free" (pure home) - navigates to Create */}
        {onOpenCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-lg border border-white/20 bg-transparent hover:bg-white/[0.08] hover:border-white/30 transition-all ml-2"
          >
            Try our AI for free
          </button>
        )}

        {/* Upgrade pill / Credits */}
        <button type="button" className="btn-upgrade ml-2 flex items-center gap-1.5 px-3">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
          </svg>
          {credits !== null ? <span className="font-bold">{credits} Credits</span> : "Upgrade"}
        </button>

        {/* Avatar */}
        <div className="ml-2 flex flex-shrink-0 items-center">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-[14px] font-medium text-gray-300 hover:text-white transition-colors">Log In</button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </header>
  );
}
