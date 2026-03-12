"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center p-8">
      <div className="max-w-lg w-full p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-4 font-mono break-all">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
