"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { BlogPipelineRun, BlogBlock, BlogMedia } from "@/types/blog";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { toast } from "react-hot-toast";

interface PreviewStageProps {
  run: BlogPipelineRun;
  media: BlogMedia[];
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}

interface ImageSlot {
  slot: string;
  label: string;
}

function normalizeOutput(parsedOutput: unknown, rawResponse?: string): Record<string, unknown> | undefined {
  if (rawResponse && rawResponse.trim()) {
    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }

  if (parsedOutput && typeof parsedOutput === "object" && !Array.isArray(parsedOutput)) {
    return parsedOutput as Record<string, unknown>;
  }
  if (typeof parsedOutput === "string" && parsedOutput.trim()) {
    try {
      const parsed = JSON.parse(parsedOutput);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  if (rawResponse && rawResponse.trim()) {
    try {
      return JSON.parse(rawResponse) as Record<string, unknown>;
    } catch {
      return { content: rawResponse };
    }
  }
  return undefined;
}

export default function PreviewStage({ run, media, onPublish, onUnpublish, onArchive }: PreviewStageProps) {
  const { uploadMedia, deleteMedia } = useBlogAdminStore();
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // --- Writing output (blocks) ---
  const writingExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write"),
    [run.executions]
  );
  const writingOutput = useMemo(
    () => normalizeOutput(writingExec?.parsedOutput, writingExec?.rawResponse),
    [writingExec?.parsedOutput, writingExec?.rawResponse]
  );
  const blocks: BlogBlock[] = useMemo(
    () => (writingOutput?.blocks as BlogBlock[]) || [],
    [writingOutput]
  );
  const excerpt = (writingOutput?.excerpt as string) || "";
  const tags = (writingOutput?.tags as string[]) || (writingOutput?.recommended_tags as string[]) || [];

  // --- Prompts output (image slots) ---
  const promptsExec = useMemo(
    () => run.executions?.find((e) => e.stage === "prompts"),
    [run.executions]
  );
  const promptsOutput = useMemo(
    () => normalizeOutput(promptsExec?.parsedOutput, promptsExec?.rawResponse),
    [promptsExec?.parsedOutput, promptsExec?.rawResponse]
  );

  // Build the full list of image upload slots from prompts output
  const imageSlots: ImageSlot[] = useMemo(() => {
    const slots: ImageSlot[] = [];
    const output = promptsOutput;
    if (!output) return slots;

    // Cover prompt
    const coverPrompt = output.cover_prompt;
    if (coverPrompt && typeof coverPrompt === "object" && !Array.isArray(coverPrompt)) {
      let cp = coverPrompt as Record<string, unknown>;
      if ("Key" in cp && "Value" in cp) cp = (cp.Value as Record<string, unknown>) || {};
      slots.push({ slot: "cover", label: `کاور — ${(cp.prompt as string || "").slice(0, 60)}` });
    } else if (typeof coverPrompt === "string" && coverPrompt) {
      slots.push({ slot: "cover", label: `کاور — ${coverPrompt.slice(0, 60)}` });
    }

    // Inline prompts
    const inlinePrompts = output.inline_prompts;
    if (Array.isArray(inlinePrompts)) {
      for (let i = 0; i < inlinePrompts.length; i++) {
        let ip = inlinePrompts[i] as Record<string, unknown>;
        if (ip && typeof ip === "object" && "Key" in ip && "Value" in ip) {
          ip = (ip.Value as Record<string, unknown>) || {};
        }
        const slotId = (ip.suggested_slot_id as string) || `img-${i + 1}`;
        const promptText = (ip.prompt as string) || "";
        slots.push({ slot: slotId, label: `تصویر ${i + 1} — ${promptText.slice(0, 60)}` });
      }
    }

    // Fallback: if no prompts output, derive from blocks
    if (slots.length === 0) {
      const imageBlocks = blocks.filter((b) => b.type === "image");
      for (const b of imageBlocks) {
        const slotId = b.imageSlotId || `img-${b.order}`;
        slots.push({ slot: slotId, label: `تصویر — ${b.alt || slotId}` });
      }
    }

    return slots;
  }, [promptsOutput, blocks]);

  // --- Media ---
  const mediaMap = useMemo(() => {
    const map: Record<string, BlogMedia> = {};
    for (const m of media) {
      map[m.slot] = m;
    }
    return map;
  }, [media]);

  // Resolve image blocks with media URLs, and inject missing prompt slots in correct order
  const resolvedBlocks = useMemo(() => {
    // Only inline slots (img-N), not cover — cover is separate from article body
    const inlineSlotIds = imageSlots.filter((s) => s.slot !== "cover").map((s) => s.slot);
    const existingImageSlots = new Set(
      blocks.filter((b) => b.type === "image").map((b) => b.imageSlotId)
    );
    const missingSlots = inlineSlotIds.filter((s) => !existingImageSlots.has(s));

    // Resolve media for existing blocks (no reordering)
    const resolved = blocks.map((block) => {
      if (block.type === "image" && block.imageSlotId) {
        const m = mediaMap[block.imageSlotId];
        return m ? { ...block, imageId: m.filePath || m.publicPath } : block;
      }
      return block;
    });

    // Insert missing slots at evenly distributed positions among text blocks
    if (missingSlots.length > 0) {
      const textBlockCount = resolved.filter((b) => b.type !== "image").length;
      const totalImages = inlineSlotIds.length;

      // Calculate target positions for each image (among text blocks)
      // e.g. 3 images, 10 text blocks → after text #2, #5, #8
      const targetPositions: number[] = [];
      for (let i = 0; i < totalImages; i++) {
        targetPositions.push(Math.round((i + 1) * textBlockCount / (totalImages + 1)));
      }

      // Map existing image blocks to their position index among text blocks
      const existingImagePositions = new Map<string, number>();
      let textIdx = 0;
      for (const b of resolved) {
        if (b.type === "image") {
          if (b.imageSlotId) existingImagePositions.set(b.imageSlotId, textIdx);
        } else {
          textIdx++;
        }
      }

      // Build final array: walk through text blocks, inserting images at target positions
      const final: typeof resolved = [];
      textIdx = 0;
      let missingIdx = 0;

      for (const block of resolved) {
        if (block.type !== "image") {
          textIdx++;
          final.push(block);

          // Check if any image (existing or missing) should go after this text block
          for (let imgIdx = 0; imgIdx < totalImages; imgIdx++) {
            const slotId = inlineSlotIds[imgIdx];
            if (existingImagePositions.has(slotId)) continue; // already placed
            if (missingIdx >= missingSlots.length) continue;
            if (missingSlots[missingIdx] !== slotId) continue;

            if (textIdx >= targetPositions[imgIdx]) {
              const slotMeta = imageSlots.find((s) => s.slot === slotId);
              final.push({
                type: "image" as const,
                order: final.length,
                imageSlotId: slotId,
                alt: slotMeta?.label || slotId,
                caption: "",
              });
              missingIdx++;
            }
          }
        } else {
          final.push(block);
        }
      }

      // Append any remaining missing images at the end
      while (missingIdx < missingSlots.length) {
        const slotId = missingSlots[missingIdx];
        const slotMeta = imageSlots.find((s) => s.slot === slotId);
        final.push({
          type: "image" as const,
          order: final.length,
          imageSlotId: slotId,
          alt: slotMeta?.label || slotId,
          caption: "",
        });
        missingIdx++;
      }

      return final;
    }

    return resolved;
  }, [blocks, mediaMap, imageSlots]);

  // --- Upload handlers ---
  const handleUpload = useCallback(async (slot: string, file: File) => {
    if (!run.postId) {
      toast.error("مقاله هنوز ایجاد نشده است");
      return;
    }
    setUploadingSlot(slot);
    try {
      const existing = mediaMap[slot];
      if (existing) {
        await deleteMedia(existing.id);
      }
      const mediaResult = await uploadMedia(run.postId, slot, file, slot);
      if (mediaResult) {
        toast.success("تصویر آپلود شد");
      } else {
        toast.error("خطا در آپلود تصویر");
      }
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setUploadingSlot(null);
    }
  }, [run.postId, mediaMap, uploadMedia, deleteMedia]);

  const handleFileChange = useCallback((slot: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(slot, file);
    }
    e.target.value = "";
  }, [handleUpload]);

  const triggerFileInput = useCallback((slot: string) => {
    fileInputRefs.current.get(slot)?.click();
  }, []);

  const statusLabel = run.status === "published" ? "منتشر شده" :
    run.status === "ready" ? "آماده انتشار" :
    run.status === "media_pending" ? "در انتظار تصاویر" :
    "پیشنمایش";

  const uploadedCount = imageSlots.filter((s) => mediaMap[s.slot]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">پیشنمایش و انتشار</h3>
          <p className="text-sm text-gray-600">وضعیت: {statusLabel}</p>
        </div>
        <div className="flex gap-2">
          {run.status === "ready" && (
            <Button onClick={onPublish}>انتشار مقاله</Button>
          )}
          {run.status === "published" && (
            <Button variant="outline" onClick={onUnpublish}>
              غیرانتشار
            </Button>
          )}
          {(run.status === "ready" || run.status === "published") && (
            <Button variant="danger" onClick={onArchive}>
              بایگانی
            </Button>
          )}
        </div>
      </div>

      {/* Image Upload Section */}
      {imageSlots.length > 0 && (
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">آپلود تصاویر</h3>
              <p className="text-sm text-gray-500">{uploadedCount} از {imageSlots.length} آپلود شده</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageSlots.map((imgSlot) => {
              const existing = mediaMap[imgSlot.slot];
              const isUploading = uploadingSlot === imgSlot.slot;
              return (
                <div key={imgSlot.slot} className="border rounded-lg overflow-hidden">
                  {existing ? (
                    <div className="relative aspect-video bg-gray-100">
                      <Image
                        src={existing.filePath || existing.publicPath}
                        alt={imgSlot.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-50 border-b border-dashed border-gray-300 flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs text-gray-400">تصویر آپلود نشده</p>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-700 mb-2 line-clamp-2" title={imgSlot.label}>
                      {imgSlot.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => triggerFileInput(imgSlot.slot)}
                        disabled={isUploading}
                      >
                        {isUploading ? "در حال آپلود..." : existing ? "جایگزینی" : "آپلود"}
                      </Button>
                      {existing && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            const ok = await deleteMedia(existing.id);
                            if (ok) toast.success("حذف شد");
                          }}
                        >
                          حذف
                        </Button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(imgSlot.slot, el);
                      }}
                      onChange={(e) => handleFileChange(imgSlot.slot, e)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Article Preview */}
      <div className="border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-voxcina-blue mb-4">{run.topic}</h1>
        
        {excerpt && (
          <p className="text-gray-600 mb-4 italic">{excerpt}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>دسته: {run.category}</span>
          {run.approvedAt && (
            <span>تاریخ انتشار: {new Date(run.approvedAt).toLocaleDateString("fa-IR")}</span>
          )}
        </div>

        <div className="prose max-w-none">
          {resolvedBlocks.map((block, index) => (
            <div key={block.id || index} className="mb-4">
              {block.type === "title" && (
                <h1 className="text-3xl font-bold text-voxcina-blue">{block.text}</h1>
              )}
              {block.type === "header" && (
                <h2 className="text-2xl font-bold text-voxcina-blue mt-6 mb-3">{block.text}</h2>
              )}
              {block.type === "section" && (
                <h3 className="text-xl font-bold text-voxcina-blue mt-4 mb-2">{block.text}</h3>
              )}
              {block.type === "subsection" && (
                <h4 className="text-lg font-bold text-voxcina-blue mt-3 mb-2">{block.text}</h4>
              )}
              {block.type === "text" && (
                <p className="text-gray-900 leading-relaxed">{block.text}</p>
              )}
              {block.type === "image" && (
                <figure className="my-4">
                  {block.imageId ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={block.imageId}
                        alt={block.alt || "article image"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 h-32 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      {block.imageSlotId || "تصویر"}
                    </div>
                  )}
                  {block.caption && (
                    <figcaption className="text-sm text-gray-600 mt-2 text-center">
                      {block.caption}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="bg-secondary-200 text-voxcina-blue px-3 py-1 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
