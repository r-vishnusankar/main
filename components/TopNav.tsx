"use client";

export default function TopNav() {
  return (
    <div className="h-16 bg-[#1a1a1a] border-b border-[#3a3a3a] flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Creator</span>
          <span className="text-sm text-gray-400">Banner Creator</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <button className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#2a2a2a] rounded">Create</button>
          <button className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#2a2a2a] rounded">Templates</button>
          <button className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#2a2a2a] rounded">Help</button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          U
        </div>
      </div>
    </div>
  );
}
