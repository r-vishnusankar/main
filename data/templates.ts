import type { AspectRatio } from "@/types/banner";

export interface TemplateItem {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  promptHint: string;
  gradient: string; // Tailwind gradient classes for preview icon
  icon: "carousel" | "feed" | "landscape" | "portrait" | "blog" | "header" | "banner" | "star" | "heart" | "browser";
}

export interface TemplateCategory {
  id: string;
  title: string;
  templates: TemplateItem[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "instagram",
    title: "Instagram",
    templates: [
      {
        id: "ig-carousel",
        name: "Instagram carousel",
        aspectRatio: "1:1",
        promptHint: "Square carousel slide for Instagram, modern minimal design, soft lighting",
        gradient: "from-amber-400 to-emerald-500",
        icon: "carousel",
      },
      {
        id: "ig-feed-ad",
        name: "Instagram feed ad",
        aspectRatio: "1:1",
        promptHint: "Instagram feed advertisement, bold CTA, professional product shot style",
        gradient: "from-amber-400 to-emerald-500",
        icon: "feed",
      },
      {
        id: "ig-landscape",
        name: "Instagram landscape post",
        aspectRatio: "16:9",
        promptHint: "Wide landscape post for Instagram, cinematic, high contrast",
        gradient: "from-violet-500 to-blue-600",
        icon: "landscape",
      },
      {
        id: "ig-portrait",
        name: "Instagram portrait post",
        aspectRatio: "1:1",
        promptHint: "Portrait-style Instagram post, vertical composition, clean layout",
        gradient: "from-pink-500 to-rose-600",
        icon: "portrait",
      },
    ],
  },
  {
    id: "blog-website",
    title: "Blog and website",
    templates: [
      {
        id: "blog-graphic",
        name: "Blog graphic",
        aspectRatio: "1:1",
        promptHint: "Blog feature graphic, editorial style, bold typography space",
        gradient: "from-fuchsia-500 to-purple-700",
        icon: "blog",
      },
      {
        id: "blog-header",
        name: "Blog header",
        aspectRatio: "3:1",
        promptHint: "Blog header banner, full-width hero, gradient overlay, space for title",
        gradient: "from-pink-500 to-purple-600",
        icon: "header",
      },
      {
        id: "etsy-banner",
        name: "Etsy shop banner",
        aspectRatio: "4:1",
        promptHint: "Etsy shop banner, marketplace style, product showcase strip",
        gradient: "from-blue-500 to-emerald-500",
        icon: "banner",
      },
      {
        id: "etsy-cover",
        name: "Etsy shop cover",
        aspectRatio: "4:1",
        promptHint: "Etsy shop cover image, welcoming, brand highlight",
        gradient: "from-emerald-400 to-amber-400",
        icon: "heart",
      },
    ],
  },
  {
    id: "web",
    title: "Web",
    templates: [
      {
        id: "web-blog",
        name: "Blog",
        aspectRatio: "16:9",
        promptHint: "Web blog hero image, professional, readable layout placeholder",
        gradient: "from-rose-500 to-pink-600",
        icon: "blog",
      },
      {
        id: "web-event",
        name: "Event microsite",
        aspectRatio: "16:9",
        promptHint: "Event landing hero, date and CTA focus, modern event branding",
        gradient: "from-emerald-400 to-amber-400",
        icon: "heart",
      },
      {
        id: "web-learning",
        name: "Learning journal",
        aspectRatio: "16:9",
        promptHint: "Learning or course header, educational, clear and inspiring",
        gradient: "from-yellow-400 to-emerald-500",
        icon: "star",
      },
      {
        id: "web-linkinbio",
        name: "Link in bio",
        aspectRatio: "1:1",
        promptHint: "Link-in-bio page header, profile style, minimal and clickable",
        gradient: "from-violet-500 to-blue-600",
        icon: "blog",
      },
    ],
  },
  {
    id: "social",
    title: "Social and ads",
    templates: [
      {
        id: "li-post",
        name: "LinkedIn blog post",
        aspectRatio: "16:9",
        promptHint: "LinkedIn article cover, professional, B2B style, clean and credible",
        gradient: "from-emerald-500 to-blue-600",
        icon: "banner",
      },
      {
        id: "webpage",
        name: "Webpage",
        aspectRatio: "16:9",
        promptHint: "Webpage hero section, star focal point, modern SaaS or product style",
        gradient: "from-emerald-400 to-blue-500",
        icon: "star",
      },
      {
        id: "fb-ad",
        name: "Facebook feed ad",
        aspectRatio: "1:1",
        promptHint: "Facebook feed ad, square format, clear CTA, scroll-stopping",
        gradient: "from-blue-500 to-indigo-600",
        icon: "feed",
      },
      {
        id: "twitter-header",
        name: "Twitter header",
        aspectRatio: "3:1",
        promptHint: "Twitter/X header banner, profile branding, wide canvas",
        gradient: "from-sky-400 to-violet-500",
        icon: "banner",
      },
    ],
  },
];
