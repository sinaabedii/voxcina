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

function normalizeWriterOutput(parsedOutput: unknown, rawResponse?: string): Record<string, unknown> | undefined {
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
  const { uploadMedia, deleteMedia, isLoading } = useBlogAdminStore();
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const writingExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write"),
    [run.executions]
  );
  const output = useMemo(
    () => normalizeWriterOutput(writingExec?.parsedOutput, writingExec?.rawResponse),
    [writingExec?.parsedOutput, writingExec?.rawResponse]
  );
  const blocks: BlogBlock[] = useMemo(
    () => (output?.blocks as BlogBlock[]) || [],
    [output]
  );
  const excerpt = (output?.excerpt as string) || "";
  const tags = (output?.tags as string[]) || (output?.recommended_tags as string[]) || [];

  // Build media map: slot -> BlogMedia
  const mediaMap = useMemo(() => {
    const map: Record<string, BlogMedia> = {};
    for (const m of media) {
      map[m.slot] = m;
    }
    return map;
  }, [media]);

  // Resolve image blocks with media URLs
  const resolvedBlocks = useMemo(() => {
    return blocks.map((block) => {
      if (block.type === "image" && block.imageSlotID) {
        const m = mediaMap[block.imageSlotID];
        if (m) {
          return { ...block, imageID: m.filePath || m.publicPath };
        }
      }
      return block;
    });
  }, [blocks, mediaMap]);

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
                  {block.imageID ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={block.imageID}
                        alt={block.alt || "article image"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 h-64 rounded-lg flex flex-col items-center justify-center gap-2">
                      <p className="text-gray-500 text-sm">تصویر آپلود نشده</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerFileInput(block.imageSlotID || `img-${index}`)}
                        disabled={uploadingSlot === block.imageSlotID}
                      >
                        {uploadingSlot === block.imageSlotID ? "در حال آپلود..." : "آپلود تصویر"}
                      </Button>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        ref={(el) => {
                          if (el) fileInputRefs.current.set(block.imageSlotID || `img-${index}`, el);
                        }}
                        onChange={(e) => handleFileChange(block.imageSlotID || `img-${index}`, e)}
                      />
                    </div>
                  )}
                  {block.imageID && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">جایگاه: {block.imageSlotID}</span>
                      <button
                        className="text-xs text-blue-500 hover:underline"
                        onClick={() => triggerFileInput(block.imageSlotID || `img-${index}`)}
                        disabled={uploadingSlot === block.imageSlotID}
                      >
                        جایگزینی
                      </button>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        ref={(el) => {
                          if (el) fileInputRefs.current.set(block.imageSlotID || `img-${index}`, el);
                        }}
                        onChange={(e) => handleFileChange(block.imageSlotID || `img-${index}`, e)}
                      />
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
