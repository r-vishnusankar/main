"use client";

export default function HelpView() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Help & Documentation</h1>
      <p className="text-gray-400 mb-8">Learn how to create amazing banners with our platform</p>

      <div className="space-y-6">
        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>✨</span> Generating Images
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>Use AI to generate images from text descriptions:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to the <strong>Create</strong> tab</li>
              <li>Select &quot;Generate image&quot; workflow</li>
              <li>Enter a detailed description of what you want</li>
              <li>Click &quot;Generate&quot; to create your image</li>
              <li>The image will be added to your banner carousel</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              <strong>Tip:</strong> Be specific in your descriptions. Include details about style, colors, composition, and mood for best results.
            </p>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🖼️</span> Creating Banners from Products
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>Create professional banners using your product images:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to the <strong>Create</strong> tab</li>
              <li>Select &quot;Banner from product&quot; workflow</li>
              <li>Choose a template that matches your needs</li>
              <li>Upload your product image</li>
              <li>Describe how you want the banner to look (style, layout, background, text placement)</li>
              <li>Click &quot;Create&quot; to generate your banner</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              <strong>Tip:</strong> Templates provide suggested prompts. You can edit them to match your specific needs.
            </p>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>📁</span> Managing Assets
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>The <strong>Banners</strong> tab lets you:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View all your created banners</li>
              <li>Upload and store image assets for reuse</li>
              <li>Open saved banners to continue editing</li>
              <li>Delete banners or assets you no longer need</li>
            </ul>
            <p className="mt-3 text-sm text-gray-400">
              <strong>Tip:</strong> Upload product images, logos, or backgrounds to your assets folder for quick access when creating banners.
            </p>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🎨</span> Using Templates
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>Templates help you get started quickly:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Browse templates by category (Instagram, Blog, Web, Social)</li>
              <li>Each template sets the correct aspect ratio</li>
              <li>Templates include suggested prompts for AI generation</li>
              <li>Click a template to select it and start creating</li>
            </ul>
            <p className="mt-3 text-sm text-gray-400">
              <strong>Tip:</strong> Templates are organized by platform. Choose one that matches where you&apos;ll use your banner.
            </p>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>⚙️</span> Banner Settings
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>Customize your banner carousel:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Aspect Ratio:</strong> Choose 16:9, 3:1, 4:1, or 1:1</li>
              <li><strong>Autoplay:</strong> Enable automatic slide transitions</li>
              <li><strong>Speed:</strong> Control how fast slides change (2-15 seconds)</li>
              <li><strong>Product Name:</strong> Add a name for your banner project</li>
            </ul>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>💾</span> Exporting Banners
          </h2>
          <div className="space-y-2 text-gray-300">
            <p>Export your finished banners:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Go to the Editor view after adding slides</li>
              <li>Use the Export panel on the right</li>
              <li>Download individual slides or the entire carousel</li>
              <li>Banners are saved as high-quality images</li>
            </ul>
          </div>
        </section>

        <section className="p-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>❓</span> Common Questions
          </h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-medium mb-1">Can I edit banners after creating them?</h3>
              <p className="text-sm text-gray-400">Yes! Open any saved banner from the Banners tab to continue editing.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">What image formats are supported?</h3>
              <p className="text-sm text-gray-400">You can upload any standard image format (JPG, PNG, WebP, etc.).</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">How do I reuse an uploaded image?</h3>
              <p className="text-sm text-gray-400">Go to Banners → Assets tab, click on any image to use it in your current banner.</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Can I create banners without AI?</h3>
              <p className="text-sm text-gray-400">Yes! You can upload your own images directly without using AI generation.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
