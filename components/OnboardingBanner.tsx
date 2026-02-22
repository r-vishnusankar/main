"use client";

import { useState, useEffect } from "react";

const ONBOARDING_KEY = "bannerCreatorOnboardingDone";

export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      setDismissed(!!done);
    } catch {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <div className="mb-6 p-4 bg-[#0066ff]/10 border border-[#0066ff]/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 className="font-semibold text-white mb-1">Quick start</h3>
        <p className="text-sm text-gray-300">
          1) Choose what to create (e.g. Banner for homepage) → 2) Edit the prompt if needed and click Generate → 3) Find your images in <strong>Banners → Assets</strong>. You can also upload images; they appear in the editor and in Assets.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
      >
        Got it
      </button>
    </div>
  );
}
