"use client";

export type BlogTemplateId = "card" | "dark" | "hero";

export interface BlogTemplateProps {
  imageUrl: string;
  headline: string;
  subtitle?: string;
  body: string;
  cta?: string;
  date?: string;
  brandName?: string;
  socialHandle?: string;
}

/** Template 1: Card layout - image left, text right (light theme) */
export function BlogTemplateCard({
  imageUrl,
  headline,
  subtitle,
  body,
  cta,
  brandName,
  socialHandle,
}: BlogTemplateProps) {
  return (
    <div className="bg-[#f5f5f5] rounded-xl overflow-hidden shadow-lg max-w-4xl mx-auto w-full">
      <div className="flex flex-col md:flex-row bg-white">
        <div className="md:w-[40%] min-h-[200px] md:min-h-[320px]">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-6 md:p-8 flex flex-col">
          {subtitle && (
            <div className="bg-gray-800 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 w-fit mb-4">
              {subtitle}
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-black text-black leading-tight mb-4">
            {headline}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 whitespace-pre-wrap">
            {body}
          </p>
          {cta && (
            <p className="text-[var(--accent)] font-semibold text-sm mt-4">
              {cta} →
            </p>
          )}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
            <span>{brandName || "Your Brand"}</span>
            <span>{socialHandle ? `@${socialHandle}` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Template 2: Dark vertical layout */
export function BlogTemplateDark({
  imageUrl,
  headline,
  subtitle,
  body,
  brandName,
  socialHandle,
}: BlogTemplateProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg max-w-xl mx-auto w-full text-white">
      <div className="p-6 space-y-6">
        <div className="flex justify-between text-xs text-gray-400">
          <span>new post</span>
          <span>001</span>
        </div>
        <h1 className="text-2xl font-bold text-center">{headline}</h1>
        <div className="flex gap-4">
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed flex-1 line-clamp-4">
            {body}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold mb-2">{subtitle || "MY STORY"}</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {body}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 min-h-[120px] rounded-lg overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-gray-300 flex-1 line-clamp-5">{body}</p>
        </div>
        <p className="text-center text-xs text-gray-500">
          {socialHandle ? `@${socialHandle}` : brandName || "@reallygreatsite"}
        </p>
      </div>
    </div>
  );
}

/** Template 3: Full-width hero image, title, date, body */
export function BlogTemplateHero({
  imageUrl,
  headline,
  subtitle,
  body,
  date,
  brandName,
  socialHandle,
}: BlogTemplateProps) {
  const displayDate = date || new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="bg-[#f5f5f5] rounded-xl overflow-hidden shadow-lg max-w-4xl mx-auto w-full">
      <div className="relative">
        <div className="aspect-[16/9] md:aspect-[3/1] relative">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {subtitle && (
            <span
              className="absolute top-4 right-4 text-white text-xs font-bold uppercase tracking-widest"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {subtitle}
            </span>
          )}
        </div>
        <div className="p-6 md:p-8 bg-white">
          <h1 className="text-2xl md:text-3xl font-black text-black leading-tight mb-2">
            {headline}
          </h1>
          <p className="text-amber-700 text-sm font-bold uppercase mb-4">
            {displayDate}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {body}
          </p>
          <p className="text-right text-xs text-gray-500 mt-6">
            {socialHandle ? `@${socialHandle}` : brandName || "@reallygreatsite"}
          </p>
        </div>
      </div>
    </div>
  );
}

const TEMPLATES: { id: BlogTemplateId; name: string; description: string }[] = [
  { id: "card", name: "Card", description: "Image left, text right" },
  { id: "dark", name: "Dark", description: "Vertical dark theme" },
  { id: "hero", name: "Hero", description: "Full-width header image" },
];

export { TEMPLATES };

export function BlogTemplateRenderer({
  templateId,
  ...props
}: BlogTemplateProps & { templateId: BlogTemplateId }) {
  switch (templateId) {
    case "card":
      return <BlogTemplateCard {...props} />;
    case "dark":
      return <BlogTemplateDark {...props} />;
    case "hero":
      return <BlogTemplateHero {...props} />;
    default:
      return <BlogTemplateCard {...props} />;
  }
}
