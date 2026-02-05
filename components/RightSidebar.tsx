"use client";

import { useState } from "react";

export default function RightSidebar() {
  const [showPromo, setShowPromo] = useState(true);

  return (
    <div className="w-80 bg-[#2a2a2a] border-l border-[#3a3a3a] flex flex-col">
      {showPromo && (
        <div className="m-4 p-4 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30 relative">
          <button
            onClick={() => setShowPromo(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎨</span>
            <span className="font-semibold">Pro Features</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Unlock advanced templates, higher resolution exports, and priority support.
          </p>
          <button className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90">
            Upgrade
          </button>
        </div>
      )}

      <div className="flex-1 px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Banners</h3>
          <div className="flex gap-2">
            <button className="p-1 hover:bg-[#3a3a3a] rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button className="p-1 hover:bg-[#3a3a3a] rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-2 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] hover:border-[#4a4a4a] cursor-pointer transition-colors"
            >
              <div className="w-full h-16 bg-[#3a3a3a] rounded mb-2 flex items-center justify-center text-gray-500 text-xs">
                Banner {i}
              </div>
              <p className="text-xs text-gray-400 truncate">banner-{i}.zip</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
