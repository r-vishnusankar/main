"use client";

export default function HelpView() {
  return (
    <div className="w-full min-w-0 px-8 py-10">
      <h1 className="text-[22px] font-semibold text-white mb-2">Help</h1>
      <p className="text-gray-400 text-[15px] mb-6">Learn how to create and manage banners.</p>

      <div className="space-y-6">
        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-3">Generating images</h2>
          <div className="space-y-2 text-gray-300 text-[15px] leading-relaxed">
            <p>Use AI to generate images from text:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to <strong>Create</strong></li>
              <li>Pick a purpose and edit the prompt</li>
              <li>Click <strong>Generate</strong> to create your image</li>
              <li>Images are added to the carousel and saved in Gallery</li>
            </ol>
            <p className="mt-3 text-gray-400">Tip: Be specific about style, colors, and composition.</p>
          </div>
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-3">Banners from products</h2>
          <div className="space-y-2 text-gray-300 text-[15px] leading-relaxed">
            <p>Create banners from product photos:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open <strong>Product</strong> in the sidebar</li>
              <li>Choose a template, upload your product image</li>
              <li>Describe style, layout, and background</li>
              <li>Click <strong>Create</strong> to generate</li>
            </ol>
            <p className="mt-3 text-gray-400">Templates set the aspect ratio and suggest a prompt you can edit.</p>
          </div>
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-3">Managing assets</h2>
          <div className="space-y-2 text-gray-300 text-[15px] leading-relaxed">
            <p>The <strong>Banners</strong> tab lets you:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View and open saved banners</li>
              <li>Upload and store image assets</li>
              <li>Delete banners or assets you don’t need</li>
            </ul>
            <p className="mt-3 text-gray-400">All generated images are also saved in the Gallery.</p>
          </div>
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-3">Templates</h2>
          <div className="space-y-2 text-gray-300 text-[15px] leading-relaxed">
            <p>Templates help you start quickly:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Browse by category (Instagram, Blog, Web, Social)</li>
              <li>Each template sets the correct aspect ratio</li>
              <li>Click a template to select it and start creating</li>
            </ul>
          </div>
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-3">Publish</h2>
          <div className="space-y-2 text-gray-300 text-[15px] leading-relaxed">
            <p>From the <strong>Publish</strong> tab you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Upload or create an image and add a caption</li>
              <li>Preview the post, then publish to Facebook, Instagram, or WhatsApp</li>
              <li>Schedule posts in India (IST) or schedule “generate then post”</li>
            </ul>
            <p className="mt-3 text-gray-400">Set Meta and WhatsApp credentials in .env to enable publishing.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
