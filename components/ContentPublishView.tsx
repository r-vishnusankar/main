"use client";

import { useState, useRef, useEffect } from "react";
import {
  openDB,
  getAllContentPosts,
  saveContentPost,
  saveAsset,
  deleteContentPost,
  updateContentPost,
  type StoredContentPostRecord,
  type ContentPostPlatform,
} from "@/lib/indexedDB";
import { buildTextToImagePrompt, buildImageToImagePrompt } from "@/lib/imagePrompt";
import {
  BlogTemplateRenderer,
  TEMPLATES,
  type BlogTemplateId,
} from "@/components/BlogTemplates";
import SchedulePostModal, { type SchedulePostPayload } from "@/components/SchedulePostModal";
import { apiFetch } from "@/lib/api";

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) resolve({ base64: match[2], mimeType: match[1] });
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  const { base64, mimeType } = await fileToBase64(file);
  return `data:${mimeType};base64,${base64}`;
}

function generateId(): string {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const PLATFORM_OPTIONS: { value: ContentPostPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog Page" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "3:1", label: "3:1" },
  { value: "4:1", label: "4:1" },
];

/** Convert UTC ISO string to datetime-local value in India (IST). */
function utcISOToISTInput(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return s.replace(", ", "T").slice(0, 16);
}

/** Interpret datetime-local value as India (IST) and return UTC ISO. */
function istInputToUTC(localValue: string): string | null {
  if (!localValue || localValue.length < 16) return null;
  const istStr = `${localValue.slice(0, 16)}:00+05:30`;
  return new Date(istStr).toISOString();
}

interface DescribeResponse {
  socialCaption: string;
  altText: string;
  blogDescription: string;
  hashtags?: string[];
}

export default function ContentPublishView() {
  // ── Content mode ──────────────────────────────────────────────────────────
  const [contentMode, setContentMode] = useState<"with_image" | "text_only">("with_image");
  const [textTopic, setTextTopic] = useState("");
  const [textTone, setTextTone] = useState("professional");
  const [generatingText, setGeneratingText] = useState(false);
  const [textGenerateError, setTextGenerateError] = useState<string | null>(null);

  // ── Image ─────────────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [triggeringCron, setTriggeringCron] = useState(false);

  // ── Content fields ────────────────────────────────────────────────────────
  const [socialCaption, setSocialCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [blogDescription, setBlogDescription] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [platform, setPlatform] = useState<ContentPostPlatform>("facebook");
  const [scheduledAt, setScheduledAt] = useState("");
  const [posts, setPosts] = useState<StoredContentPostRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<"upload" | "create">("upload");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createAspectRatio, setCreateAspectRatio] = useState("16:9");
  const [createRefFile, setCreateRefFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scheduleGenerateThenPost, setScheduleGenerateThenPost] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [blogTemplate, setBlogTemplate] = useState<BlogTemplateId>("card");
  const [blogHeadline, setBlogHeadline] = useState("");
  const [blogSubtitle, setBlogSubtitle] = useState("");
  const [blogBody, setBlogBody] = useState("");
  const [blogCta, setBlogCta] = useState("");
  const [generatingBlog, setGeneratingBlog] = useState(false);
  const [blogGenerateError, setBlogGenerateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createRefInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = async () => {
    try {
      await openDB();
      const list = await getAllContentPosts();
      setPosts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      setPosts([]);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      if (!editingId) setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, editingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setAnalyzeError(null);
    setSocialCaption("");
    setAltText("");
    setBlogDescription("");
    setHashtags([]);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const { base64, mimeType } = await fileToBase64(imageFile);
      const res = await apiFetch("/api/describe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          imageMimeType: mimeType,
          ...(context.trim() && { context: context.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyze failed");
      const parsed = data as DescribeResponse;
      setSocialCaption(parsed.socialCaption ?? "");
      setAltText(parsed.altText ?? "");
      setBlogDescription(parsed.blogDescription ?? "");
      setHashtags(Array.isArray(parsed.hashtags) ? parsed.hashtags : []);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBlogContent = async () => {
    const imageUrl = imagePreviewUrl ?? "";
    if (!imageUrl.trim()) {
      setBlogGenerateError("Add an image first (upload or create).");
      return;
    }
    setGeneratingBlog(true);
    setBlogGenerateError(null);
    try {
      let imageBase64: string;
      let imageMimeType: string;
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageBase64 = match[2];
        imageMimeType = match[1];
      } else if (imageFile) {
        const b = await fileToBase64(imageFile);
        imageBase64 = b.base64;
        imageMimeType = b.mimeType;
      } else {
        setBlogGenerateError("Image must be uploaded or AI-generated. Try re-uploading.");
        setGeneratingBlog(false);
        return;
      }
      const res = await apiFetch("/api/generate-blog-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          ...(context.trim() && { context: context.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setBlogHeadline(data.headline ?? "It's All in the Details");
      setBlogSubtitle(data.subtitle ?? "");
      setBlogBody(data.body ?? "");
      setBlogCta(data.cta ?? "Read more");
      setSocialCaption(data.socialCaption ?? "");
      setAltText(data.altText ?? "");
      setBlogDescription(data.body ?? "");
    } catch (err) {
      setBlogGenerateError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGeneratingBlog(false);
    }
  };

  const hashtagsStr = hashtags.join(", ");
  const setHashtagsFromStr = (s: string) => {
    setHashtags(
      s
        .split(/[\s,#]+/)
        .map((h) => h.trim().replace(/^#/, ""))
        .filter(Boolean)
    );
  };

  const loadPostForEdit = (post: StoredContentPostRecord) => {
    setEditingId(post.id);
    setImageFile(null);
    setImagePreviewUrl(post.imageUrl);
    setSocialCaption(post.socialCaption);
    setAltText(post.altText);
    setBlogDescription(post.blogDescription);
    setHashtags(post.hashtags ?? []);
    setPlatform(
      post.platform === "social" || post.platform === "shopify_blog"
        ? "facebook"
        : post.platform
    );
    setScheduledAt(post.scheduledAt ? utcISOToISTInput(post.scheduledAt) : "");
    setImageSourceMode("upload");
    setBlogTemplate((post.blogTemplate as BlogTemplateId) || "card");
    setBlogHeadline(post.blogHeadline ?? "");
    setBlogSubtitle(post.blogSubtitle ?? "");
    setBlogBody(post.blogBody ?? "");
    setBlogCta(post.blogCta ?? "");
  };

  const handleGenerateTextContent = async () => {
    if (!textTopic.trim()) return;
    setGeneratingText(true);
    setTextGenerateError(null);
    try {
      const res = await apiFetch("/api/generate-post-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: textTopic.trim(), tone: textTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setSocialCaption(data.socialCaption ?? "");
      setBlogDescription(data.blogDescription ?? "");
      if (Array.isArray(data.hashtags)) setHashtags(data.hashtags);
    } catch (err) {
      setTextGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingText(false);
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setSocialCaption("");
    setAltText("");
    setBlogDescription("");
    setHashtags([]);
    setPlatform("facebook");
    setScheduledAt("");
    setAnalyzeError(null);
    setPublishError(null);
    setShowPreviewModal(false);
    setCreatePrompt("");
    setCreateAspectRatio("16:9");
    setCreateRefFile(null);
    setGenerateError(null);
    setScheduleGenerateThenPost(false);
    setBlogTemplate("card");
    setBlogHeadline("");
    setBlogSubtitle("");
    setBlogBody("");
    setBlogCta("");
    setBlogGenerateError(null);
    setTextTopic("");
    setTextGenerateError(null);
  };

  const handleGenerateImage = async () => {
    const trimmed = createPrompt.trim();
    if (!trimmed) {
      setGenerateError("Enter a prompt");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      let promptToSend: string;
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (createRefFile) {
        const { base64, mimeType } = await fileToBase64(createRefFile);
        imageBase64 = base64;
        imageMimeType = mimeType;
        promptToSend = buildImageToImagePrompt(trimmed, createAspectRatio);
      } else {
        promptToSend = buildTextToImagePrompt(trimmed, createAspectRatio);
      }
      const res = await apiFetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          aspectRatio: createAspectRatio,
          ...(imageBase64 && imageMimeType ? { imageBase64, imageMimeType } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      const imageUrl = data.imageUrl as string;
      if (imageUrl) {
        setImagePreviewUrl(imageUrl);
        setImageFile(null);
        setCreateRefFile(null);
        try {
          await openDB();
          await saveAsset({
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            imageUrl,
            name: `Publish: ${trimmed.substring(0, 35)}${trimmed.length > 35 ? "..." : ""}`,
            uploadedAt: new Date().toISOString(),
            prompt: trimmed || undefined,
            aspectRatio: createAspectRatio,
          });
        } catch (err) {
          console.warn("Failed to save generated image to gallery:", err);
        }
      }
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const describeRes = await apiFetch("/api/describe-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: match[2], imageMimeType: match[1] }),
        }).catch(() => null);
        if (describeRes?.ok) {
          const desc = await describeRes.json();
          setSocialCaption(desc.socialCaption ?? "");
          setAltText(desc.altText ?? "");
          setBlogDescription(desc.blogDescription ?? "");
          if (Array.isArray(desc.hashtags)) setHashtags(desc.hashtags);
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePost = async () => {
    const scheduledAtUTC = istInputToUTC(scheduledAt);

    if (scheduleGenerateThenPost) {
      if (!createPrompt.trim() || !socialCaption.trim() || !scheduledAtUTC) {
        setPublishError("For 'Generate at scheduled time': enter prompt, caption, and date/time (India).");
        return;
      }
      setSaving(true);
      setPublishError(null);
      try {
        let imageBase64: string | undefined;
        let imageMimeType: string | undefined;
        if (createRefFile) {
          const b = await fileToBase64(createRefFile);
          imageBase64 = b.base64;
          imageMimeType = b.mimeType;
        }
        const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const res = await apiFetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "generate_then_post",
            id,
            prompt: createPrompt.trim(),
            aspectRatio: createAspectRatio,
            imageBase64: imageBase64 ?? null,
            imageMimeType: imageMimeType ?? null,
            socialCaption: socialCaption.trim(),
            platform,
            scheduledAt: scheduledAtUTC,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Schedule failed");
        setPublishError(null);
        setScheduledAt("");
        setScheduleGenerateThenPost(false);
        setCreatePrompt("");
        setSocialCaption("");
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : "Schedule failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    const imageUrl = contentMode === "text_only" ? "" : (imagePreviewUrl ?? "");
    if (contentMode === "with_image" && !imageUrl.trim()) return;
    const hasContent =
      platform === "blog"
        ? blogHeadline.trim() || blogBody.trim()
        : socialCaption.trim() || blogDescription.trim();
    if (!hasContent) return;

    setSaving(true);
    setPublishError(null);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await fileToDataUrl(imageFile);
      }
      const now = new Date().toISOString();
      const record: StoredContentPostRecord = {
        id: editingId ?? generateId(),
        imageUrl: finalImageUrl,
        socialCaption: platform === "blog" ? blogHeadline : socialCaption,
        altText,
        blogDescription: platform === "blog" ? blogBody : blogDescription,
        hashtags,
        platform,
        scheduledAt: scheduledAtUTC,
        status: scheduledAtUTC ? "scheduled" : "draft",
        createdAt: editingId ? (posts.find((p) => p.id === editingId)?.createdAt ?? now) : now,
        ...(platform === "blog" && {
          blogTemplate,
          blogHeadline,
          blogSubtitle,
          blogBody,
          blogCta,
        }),
      };
      if (editingId) {
        await updateContentPost(editingId, record);
      } else {
        await saveContentPost(record);
        try {
          const caption = record.socialCaption || record.blogDescription || "Image";
          await saveAsset({
            id: `asset-${record.id}-${Date.now()}`,
            imageUrl: finalImageUrl,
            name: `Post: ${caption.substring(0, 40)}${caption.length > 40 ? "..." : ""}`,
            uploadedAt: record.createdAt,
            prompt: undefined,
            aspectRatio: undefined,
          });
        } catch (err) {
          console.warn("Failed to save post image to gallery:", err);
        }
      }
      if (scheduledAtUTC) {
        try {
          await apiFetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: record.id,
              type: "post",
              imageUrl: record.imageUrl,
              socialCaption: record.socialCaption,
              altText: record.altText,
              blogDescription: record.blogDescription,
              platform: record.platform,
              scheduledAt: scheduledAtUTC,
              createdAt: record.createdAt,
            }),
          });
        } catch {
          // Server schedule sync is best-effort; post is saved locally
        }
      }
      await loadPosts();
      clearForm();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteContentPost(id);
      if (editingId === id) clearForm();
      await loadPosts();
    } catch {
      setPublishError("Delete failed");
    }
  };

  const handlePublishNow = async (post: StoredContentPostRecord) => {
    setPublishError(null);
    try {
      if (post.platform === "blog") {
        await updateContentPost(post.id, {
          status: "published",
          publishedAt: new Date().toISOString(),
        });
        await loadPosts();
        return;
      }
      const res = await apiFetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: post.imageUrl,
          socialCaption: post.socialCaption,
          blogDescription: post.blogDescription,
          platform: post.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      await updateContentPost(post.id, {
        status: "published",
        publishedAt: new Date().toISOString(),
        externalId: data.externalId,
      });
      await loadPosts();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed");
    }
  };

  const handlePublishFromForm = async () => {
    const imageUrl = contentMode === "text_only" ? "" : (imagePreviewUrl ?? "");
    if (contentMode === "with_image" && !imageUrl.trim()) {
      setPublishError("Add an image first (upload or create).");
      return;
    }
    const hasContent =
      platform === "blog"
        ? blogHeadline.trim() || blogBody.trim()
        : socialCaption.trim() || blogDescription.trim();
    if (!hasContent) {
      setPublishError(platform === "blog" ? "Add headline and body, or generate blog content." : "Add a caption or description.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      let finalImageUrl = imageUrl;
      if (contentMode === "with_image" && imageFile) finalImageUrl = await fileToDataUrl(imageFile);

      if (platform === "blog") {
        const id = editingId ?? generateId();
        const now = new Date().toISOString();
        const record: StoredContentPostRecord = {
          id,
          imageUrl: finalImageUrl,
          socialCaption: blogHeadline,
          altText,
          blogDescription: blogBody,
          hashtags,
          platform: "blog",
          scheduledAt: null,
          status: "published",
          createdAt: editingId ? (posts.find((p) => p.id === editingId)?.createdAt ?? now) : now,
          publishedAt: now,
          blogTemplate,
          blogHeadline,
          blogSubtitle,
          blogBody,
          blogCta,
        };
        if (editingId) await updateContentPost(editingId, record);
        else await saveContentPost(record);
        await loadPosts();
        clearForm();
        setPublishing(false);
        return;
      }

      const res = await apiFetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          socialCaption,
          blogDescription,
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      const id = editingId ?? generateId();
      const now = new Date().toISOString();
      const record: StoredContentPostRecord = {
        id,
        imageUrl: finalImageUrl,
        socialCaption,
        altText,
        blogDescription,
        hashtags,
        platform,
        scheduledAt: null,
        status: "published",
        createdAt: editingId ? (posts.find((p) => p.id === editingId)?.createdAt ?? now) : now,
        publishedAt: now,
        externalId: data.externalId,
      };
      try {
        if (editingId) await updateContentPost(editingId, record);
        else await saveContentPost(record);
      } catch {
        // best-effort save
      }
      await loadPosts();
      clearForm();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async (payload: SchedulePostPayload) => {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    if (payload.mode === "auto_generate") {
      const res = await apiFetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto_generate",
          id,
          imagePrompt: payload.imagePrompt,
          autoGenerateType: payload.autoGenerateType,
          aspectRatio: payload.aspectRatio ?? "1:1",
          tone: payload.tone ?? "professional",
          platforms: payload.platforms,
          scheduledAt: payload.scheduledAt,
          createdAt: now,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Schedule failed");

      // Save a draft record locally for visibility in the posts list
      await saveContentPost({
        id,
        imageUrl: "",
        socialCaption: `[Auto-${payload.autoGenerateType === "caption_only" ? "text" : "gen"}] ${payload.imagePrompt ?? ""}`.slice(0, 100),
        altText: "",
        blogDescription: "",
        hashtags: [],
        platform: (payload.platforms[0] ?? "facebook") as ContentPostPlatform,
        scheduledAt: payload.scheduledAt,
        status: "scheduled",
        createdAt: now,
        imagePrompt: payload.imagePrompt,
        tone: payload.tone,
        platforms: payload.platforms,
      });
      await loadPosts();
      return;
    }

    // mode === "use_existing"
    const imageUrl = payload.imageUrl ?? imagePreviewUrl ?? "";
    if (!imageUrl) throw new Error("No image selected for scheduling");

    // Schedule on server
    const res = await apiFetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "post",
        id,
        imageUrl,
        socialCaption: payload.socialCaption ?? socialCaption,
        altText: payload.altText ?? altText,
        blogDescription: payload.blogDescription ?? blogDescription,
        platform: payload.platforms[0] ?? platform,
        scheduledAt: payload.scheduledAt,
        createdAt: now,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Schedule failed");

    // Save locally too
    await saveContentPost({
      id,
      imageUrl,
      socialCaption: payload.socialCaption ?? socialCaption,
      altText: payload.altText ?? altText,
      blogDescription: payload.blogDescription ?? blogDescription,
      hashtags,
      platform: (payload.platforms[0] ?? platform) as ContentPostPlatform,
      scheduledAt: payload.scheduledAt,
      status: "scheduled",
      createdAt: now,
      platforms: payload.platforms,
    });
    await loadPosts();
  };

  const handleTriggerScheduler = async () => {
    setTriggeringCron(true);
    try {
      const res = await apiFetch("/api/cron/publish-scheduled", {
        headers: { Authorization: "Bearer local_test_secret" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trigger failed");

      // Sync results back to local IndexedDB
      if (Array.isArray(data.results)) {
        for (const res of data.results) {
          if (res.success) {
            await updateContentPost(res.id, {
              status: "published",
              publishedAt: new Date().toISOString(),
              ...(res.generatedContent || {}),
            });
          } else {
            await updateContentPost(res.id, {
              status: "failed",
              failureReason: res.error || "Unknown error during cron run",
            });
          }
        }
      }

      await loadPosts();
      alert(`Processed ${data.processed} jobs. See results in browser console.`);
      console.log("Cron results:", data.results);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Trigger failed");
    } finally {
      setTriggeringCron(false);
    }
  };

  const hasImageForMode = contentMode === "text_only" ? true : !!imagePreviewUrl;
  const hasTextContent =
    platform === "blog"
      ? !!(blogHeadline.trim() || blogBody.trim())
      : !!(socialCaption.trim() || blogDescription.trim());
  const canSave = hasImageForMode && hasTextContent;
  const canPreview = hasImageForMode && hasTextContent;
  const platformLabel = PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? platform;

  return (
    <div className="w-full min-w-0 px-8 py-10">
      <h1 className="text-[22px] font-semibold text-white mb-2">Publish</h1>
      <p className="text-gray-400 text-[15px] mb-6 leading-relaxed">
        Create and publish to Facebook, Instagram, WhatsApp, LinkedIn, or build a Blog page. Choose between a visual post (image + caption) or a text-only post.
      </p>

      {/* ── Content mode selector ──────────────────────────────── */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setContentMode("with_image")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border ${
            contentMode === "with_image"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "bg-[#2a2a2a] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          With Image
        </button>
        <button
          type="button"
          onClick={() => setContentMode("text_only")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border ${
            contentMode === "text_only"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "bg-[#2a2a2a] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          Text Only
        </button>
      </div>

      <div className="space-y-6">

        {/* ── Text-only topic + AI generate ───────────────────── */}
        {contentMode === "text_only" && (
          <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
            <h2 className="text-[17px] font-semibold text-white mb-1">1. Topic</h2>
            <p className="text-sm text-gray-500 mb-4">Describe what this post is about. AI will write the caption, hashtags, and description for you.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Topic / idea</label>
                <textarea
                  value={textTopic}
                  onChange={(e) => setTextTopic(e.target.value)}
                  placeholder="e.g. Summer sale 50% off all products, ends Sunday"
                  rows={3}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 resize-y"
                />
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tone</label>
                  <select
                    value={textTone}
                    onChange={(e) => setTextTone(e.target.value)}
                    className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white"
                  >
                    {["professional", "casual", "excited", "humorous", "inspirational", "urgent"].map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <button
                    type="button"
                    disabled={!textTopic.trim() || generatingText}
                    onClick={handleGenerateTextContent}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                  >
                    {generatingText ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
              {textGenerateError && <p className="text-sm text-red-400">{textGenerateError}</p>}
              {contentMode === "text_only" && platform === "instagram" && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instagram does not support text-only posts via API. Switch to another platform or add an image.
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Image section (only in with_image mode) ──────────── */}
        {contentMode === "with_image" && (
        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-4">1. Image</h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setImageSourceMode("upload")}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${imageSourceMode === "upload" ? "bg-indigo-600 text-white" : "bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"}`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setImageSourceMode("create")}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${imageSourceMode === "create" ? "bg-indigo-600 text-white" : "bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"}`}
            >
              Create with AI
            </button>
          </div>

          {imageSourceMode === "upload" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-wrap items-start gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-white font-medium transition-colors"
                >
                  Choose image
                </button>
                {imagePreviewUrl && (
                  <div className="relative">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="max-h-40 rounded-lg border border-[#3a3a3a] object-contain"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">{imageFile?.name}</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1">Optional context (product name, campaign)</label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Summer sale, Product X"
                  className="w-full max-w-md px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <button
                type="button"
                disabled={!imageFile || analyzing}
                onClick={handleAnalyze}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                {analyzing ? "Analyzing…" : "Analyze image"}
              </button>
              {analyzeError && <p className="mt-2 text-sm text-red-400">{analyzeError}</p>}
            </>
          )}

          {imageSourceMode === "create" && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Prompt</label>
                  <textarea
                    value={createPrompt}
                    onChange={(e) => setCreatePrompt(e.target.value)}
                    placeholder="Describe the image you want to create…"
                    rows={3}
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Aspect ratio</label>
                  <select
                    value={createAspectRatio}
                    onChange={(e) => setCreateAspectRatio(e.target.value)}
                    className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white"
                  >
                    {ASPECT_RATIO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    ref={createRefInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setCreateRefFile(f ?? null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => createRefInputRef.current?.click()}
                    className="px-3 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-white text-sm"
                  >
                    {createRefFile ? "Change reference image" : "Optional reference image"}
                  </button>
                  {createRefFile && <span className="ml-2 text-sm text-gray-500">{createRefFile.name}</span>}
                </div>
                <button
                  type="button"
                  disabled={!createPrompt.trim() || generating}
                  onClick={handleGenerateImage}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
                >
                  {generating ? "Generating…" : "Generate image"}
                </button>
              </div>
              {generateError && <p className="mt-2 text-sm text-red-400">{generateError}</p>}
              {imagePreviewUrl && imageSourceMode === "create" && (
                <div className="mt-4">
                  <img
                    src={imagePreviewUrl}
                    alt="Generated"
                    className="max-h-40 rounded-lg border border-[#3a3a3a] object-contain"
                  />
                </div>
              )}
            </>
          )}
        </section>
        )}
        {/* ── end with_image section ──────────────────────────── */}

        <section className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <h2 className="text-[17px] font-semibold text-white mb-4">{contentMode === "text_only" ? "2. Edit content" : "2. Edit content"}</h2>

          {platform === "blog" && (
            <>
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-3">Template</label>
                <div className="flex flex-wrap gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBlogTemplate(t.id)}
                      className={`px-4 py-3 rounded-xl border text-left transition-colors ${
                        blogTemplate === t.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white"
                          : "border-white/10 hover:border-white/20 text-gray-300"
                      }`}
                    >
                      <span className="font-medium block">{t.name}</span>
                      <span className="text-xs text-gray-500">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <button
                  type="button"
                  disabled={!imagePreviewUrl || generatingBlog}
                  onClick={handleGenerateBlogContent}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
                >
                  {generatingBlog ? "Generating…" : "Generate blog content with AI"}
                </button>
                {blogGenerateError && (
                  <p className="mt-2 text-sm text-red-400">{blogGenerateError}</p>
                )}
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Headline</label>
                  <input
                    type="text"
                    value={blogHeadline}
                    onChange={(e) => setBlogHeadline(e.target.value)}
                    placeholder="e.g. It's All in the Details"
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subtitle / category (optional)</label>
                  <input
                    type="text"
                    value={blogSubtitle}
                    onChange={(e) => setBlogSubtitle(e.target.value)}
                    placeholder="e.g. THE NEW STORY, NEWS HEADLINE"
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Body content</label>
                  <textarea
                    value={blogBody}
                    onChange={(e) => setBlogBody(e.target.value)}
                    placeholder="Blog post body…"
                    rows={6}
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Call-to-action (optional)</label>
                  <input
                    type="text"
                    value={blogCta}
                    onChange={(e) => setBlogCta(e.target.value)}
                    placeholder="e.g. Swipe to know more"
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Alt text (accessibility)</label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Image description for screen readers"
                    maxLength={125}
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>
            </>
          )}

          {platform !== "blog" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Social caption</label>
              <textarea
                value={socialCaption}
                onChange={(e) => setSocialCaption(e.target.value)}
                placeholder="Short caption for social media"
                rows={3}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Alt text (accessibility)</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Concise description for screen readers"
                maxLength={125}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
              />
              <span className="text-xs text-gray-500">{altText.length}/125</span>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Extra description (optional)</label>
              <textarea
                value={blogDescription}
                onChange={(e) => setBlogDescription(e.target.value)}
                placeholder="Longer text for post body"
                rows={2}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Hashtags (comma or space separated)</label>
              <input
                type="text"
                value={hashtagsStr}
                onChange={(e) => setHashtagsFromStr(e.target.value)}
                placeholder="e.g. summer, sale, brand"
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500"
              />
            </div>
          </div>
          )}

          <div className="flex flex-wrap gap-4 items-end mt-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as ContentPostPlatform)}
                  className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white min-w-[140px]"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!canPreview}
                onClick={() => setShowPreviewModal(true)}
                className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                Preview
              </button>
              <button
                type="button"
                disabled={!canSave || saving || publishing}
                onClick={handlePublishFromForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                {publishing ? "Publishing…" : `Publish to ${platformLabel}`}
              </button>
          </div>
          {platform !== "blog" && (
            <div className="flex flex-wrap gap-3 items-end mt-4">
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={handleSavePost}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Update post" : "Save post"}
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Schedule Post
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {platform === "blog" && (
            <div className="flex flex-wrap gap-4 items-end mt-4">
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={handleSavePost}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Update blog" : "Save blog"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {publishError && <p className="mt-2 text-sm text-red-400">{publishError}</p>}
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-semibold text-white">Saved & scheduled posts</h2>
            <button
              onClick={handleTriggerScheduler}
              disabled={triggeringCron}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-indigo-400 text-xs font-medium transition-all flex items-center gap-2"
              title="Manual trigger for local development (normally runs every minute on server)"
            >
              {triggeringCron ? (
                <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Trigger Scheduler
            </button>
          </div>
          {posts.length === 0 ? (
            <p className="text-gray-500 text-sm">No posts yet. Upload an image, analyze, edit, and save a post above.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/[0.1] card-glass overflow-hidden hover:border-white/20 transition-colors flex flex-col"
                >
                  <div className="aspect-video bg-[var(--card-bg)] relative flex items-center justify-center overflow-hidden">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.altText || "Post"}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-600 px-4 text-center">
                        {post.status === "scheduled" && post.id.startsWith("job-") ? (
                          <>
                            <div className="w-8 h-8 rounded-full border-2 border-[#3a3a3a] border-t-indigo-500 animate-spin" />
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">AI Generating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h10" />
                            </svg>
                            <span className="text-xs font-medium">Text post</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2 min-h-0">
                    <p className="text-sm text-gray-300 line-clamp-2" title={post.blogHeadline || post.socialCaption || post.blogDescription || ""}>
                      {post.platform === "blog"
                        ? post.blogHeadline || post.socialCaption || "Blog post"
                        : post.socialCaption || post.blogDescription || "No caption"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-gray-500 capitalize">{(post.platforms ?? [post.platform]).join(", ")}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        post.status === "published" ? "bg-green-500/15 text-green-400" :
                        post.status === "scheduled" ? "bg-blue-500/15 text-blue-400" :
                        post.status === "processing" ? "bg-yellow-500/15 text-yellow-400" :
                        post.status === "failed" ? "bg-red-500/15 text-red-400" :
                        "bg-gray-500/15 text-gray-400"
                      }`}>
                        {post.status}
                      </span>
                      {post.scheduledAt && (
                        <span className="text-gray-500">{new Date(post.scheduledAt).toLocaleString()}</span>
                      )}
                    </div>
                    {post.failureReason && (
                      <p className="text-xs text-red-400 mt-0.5 line-clamp-1" title={post.failureReason}>
                        {post.failureReason}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.status !== "published" && (
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post)}
                          className="text-xs px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-white font-medium"
                        >
                          Publish now
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadPostForEdit(post)}
                        className="text-xs px-3 py-1.5 bg-[var(--hover)] hover:bg-[#4a4a4a] rounded-lg text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="text-xs px-3 py-1.5 bg-red-600/80 hover:bg-red-500 rounded-lg text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        existingPost={
          imagePreviewUrl
            ? {
                imageUrl: imagePreviewUrl,
                socialCaption,
                altText,
                blogDescription,
              }
            : undefined
        }
      />

      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className={`${platform === "blog" ? "max-w-4xl" : "max-w-2xl"} bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl w-full max-h-[95vh] overflow-y-auto shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex justify-between items-center border-b border-[#3a3a3a]">
              <span className="text-white font-medium">Preview – {platformLabel}</span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              {platform === "blog" && imagePreviewUrl ? (
                <div className="bg-[#2a2a2a] rounded-lg p-4">
                  <BlogTemplateRenderer
                    templateId={blogTemplate}
                    imageUrl={imagePreviewUrl}
                    headline={blogHeadline || "Headline"}
                    subtitle={blogSubtitle}
                    body={blogBody || "Body content…"}
                    cta={blogCta}
                    date={new Date().toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    socialHandle="pixmerce"
                  />
                </div>
              ) : (
                <>
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Post preview"
                      className="w-full rounded-lg border border-[#3a3a3a] object-contain max-h-[60vh] mb-4"
                    />
                  )}
                  {!imagePreviewUrl && contentMode === "text_only" && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 bg-[#2a2a2a] rounded-lg px-4 py-3 border border-[#3a3a3a]">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                      </svg>
                      Text-only post — no image
                    </div>
                  )}
                  <div className="text-gray-300 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {socialCaption || blogDescription || "(No caption)"}
                  </div>
                  {hashtags.length > 0 && (
                    <p className="text-sm text-indigo-400 mt-3">
                      #{hashtags.join(" #")}
                    </p>
                  )}
                  {blogDescription && socialCaption && (
                    <div className="mt-4 pt-4 border-t border-[#3a3a3a] text-sm text-gray-400 whitespace-pre-wrap">
                      {blogDescription}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
