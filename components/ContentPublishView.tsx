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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
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
  const [publishing, setPublishing] = useState(false);
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
      const res = await fetch("/api/describe-image", {
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
      post.platform === "social" || post.platform === "blog" || post.platform === "shopify_blog"
        ? "facebook"
        : post.platform
    );
    setScheduledAt(post.scheduledAt ? utcISOToISTInput(post.scheduledAt) : "");
    setImageSourceMode("upload");
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
      const res = await fetch("/api/generate-image", {
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
        const describeRes = await fetch("/api/describe-image", {
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
        const res = await fetch("/api/schedule", {
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

    const imageUrl = imagePreviewUrl ?? "";
    if (!imageUrl.trim()) return;
    if (!socialCaption.trim() && !blogDescription.trim()) return;

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
        socialCaption,
        altText,
        blogDescription,
        hashtags,
        platform,
        scheduledAt: scheduledAtUTC,
        status: scheduledAtUTC ? "scheduled" : "draft",
        createdAt: editingId ? (posts.find((p) => p.id === editingId)?.createdAt ?? now) : now,
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
          await fetch("/api/schedule", {
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
      const res = await fetch("/api/publish", {
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
    const imageUrl = imagePreviewUrl ?? "";
    if (!imageUrl.trim()) {
      setPublishError("Add an image first (upload or create).");
      return;
    }
    if (!socialCaption.trim() && !blogDescription.trim()) {
      setPublishError("Add a caption or description.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) finalImageUrl = await fileToDataUrl(imageFile);
      const res = await fetch("/api/publish", {
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

  const canSave = imagePreviewUrl && (socialCaption.trim() || blogDescription.trim());
  const canPreview = imagePreviewUrl && (socialCaption.trim() || blogDescription.trim());
  const platformLabel = PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? platform;

  return (
    <div className="w-full min-w-0 px-8 py-10">
      <h1 className="text-[22px] font-semibold text-white mb-2">Publish</h1>
      <p className="text-gray-400 text-[15px] mb-6 leading-relaxed">
        Upload or create an image, add caption and content, then preview and publish to Facebook, Instagram, or WhatsApp. Schedule in India (IST) or generate image at scheduled time.
      </p>

      <div className="space-y-6">
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

        <section className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <h2 className="text-[17px] font-semibold text-white mb-4">2. Edit content</h2>
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
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as ContentPostPlatform)}
                  className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white"
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
            <div className="flex flex-wrap gap-4 items-end mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleGenerateThenPost}
                  onChange={(e) => setScheduleGenerateThenPost(e.target.checked)}
                  className="rounded bg-[#2a2a2a] border-[#3a3a3a]"
                />
                <span className="text-sm text-gray-400">Generate image at scheduled time then post</span>
              </label>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date & time (India, IST)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white"
                />
              </div>
              <button
                type="button"
                disabled={
                  saving ||
                  (scheduleGenerateThenPost
                    ? !(createPrompt.trim() && socialCaption.trim() && scheduledAt)
                    : !canSave)
                }
                onClick={handleSavePost}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-white font-medium transition-colors"
              >
                {saving ? "Saving…" : scheduleGenerateThenPost ? "Schedule generate & post" : editingId ? "Update post" : "Save post"}
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
          </div>
          {publishError && <p className="mt-2 text-sm text-red-400">{publishError}</p>}
        </section>

        <section className="p-6 rounded-xl border border-white/[0.1] card-glass">
          <h2 className="text-[17px] font-semibold text-white mb-4">Saved & scheduled posts</h2>
          {posts.length === 0 ? (
            <p className="text-gray-500 text-sm">No posts yet. Upload an image, analyze, edit, and save a post above.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/[0.1] card-glass overflow-hidden hover:border-white/20 transition-colors flex flex-col"
                >
                  <div className="aspect-video bg-[var(--card-bg)] relative">
                    <img
                      src={post.imageUrl}
                      alt={post.altText || "Post"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-2 min-h-0">
                    <p className="text-sm text-gray-300 line-clamp-2" title={post.socialCaption || post.blogDescription || ""}>
                      {post.socialCaption || post.blogDescription || "No caption"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.platform} · {post.status}
                      {post.scheduledAt && ` · ${new Date(post.scheduledAt).toLocaleString()}`}
                    </p>
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

      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
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
            <div className="p-4 space-y-4">
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Post preview"
                  className="w-full rounded-lg border border-[#3a3a3a] object-contain max-h-80"
                />
              )}
              <div className="text-gray-300 whitespace-pre-wrap break-words">
                {socialCaption || blogDescription || "(No caption)"}
              </div>
              {hashtags.length > 0 && (
                <p className="text-sm text-gray-500">
                  #{hashtags.join(" #")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
