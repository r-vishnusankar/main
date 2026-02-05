"use client";

interface HomeViewProps {
  onNavigate?: (navId: "create" | "banners" | "templates" | "help") => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Welcome to Banner Creator</h1>
      <p className="text-gray-400 mb-8">Create stunning banners for your social media, websites, and marketing campaigns.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">✨</span>
            <h3 className="text-xl font-semibold">Quick Start</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Generate beautiful banners instantly using AI. Just describe what you want and let our AI create it for you.
          </p>
          <button
            onClick={() => onNavigate?.("create")}
            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-sm font-medium"
          >
            Start Creating →
          </button>
        </div>

        <div className="p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📁</span>
            <h3 className="text-xl font-semibold">Your Assets</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Access all your created banners and uploaded images. Organize and reuse your assets anytime.
          </p>
          <button
            onClick={() => onNavigate?.("banners")}
            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-sm font-medium"
          >
            View Assets →
          </button>
        </div>

        <div className="p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎨</span>
            <h3 className="text-xl font-semibold">Templates</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Browse professional templates for Instagram, blogs, websites, and social media. Find the perfect starting point.
          </p>
          <button
            onClick={() => onNavigate?.("templates")}
            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-sm font-medium"
          >
            Browse Templates →
          </button>
        </div>

        <div className="p-6 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">❓</span>
            <h3 className="text-xl font-semibold">Need Help?</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Learn how to create amazing banners, use templates, and make the most of our features.
          </p>
          <button
            onClick={() => onNavigate?.("help")}
            className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-sm font-medium"
          >
            Get Help →
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-400 text-sm">Your recent banners and creations will appear here.</p>
      </div>
    </div>
  );
}
