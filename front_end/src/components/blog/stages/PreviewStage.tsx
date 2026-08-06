"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { BlogPipelineRun, BlogPost, BlogBlock, BlogMedia, BlockType } from "@/types/blog";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { toast } from "react-hot-toast";
import BlogProductCard from "../BlogProductCard";

const BLOCK_TYPE_LABELS: Record<string, string> = {
  title: "عنوان",
  header: "سرتیتر",
  txt: "پاراگراف",
  list: "لیست",
  quote: "نقل قول",
  image: "تصویر",
  product: "محصول",
};

// Section types an admin can insert or convert a block into. "title" is a
// singleton and always stays first, so it's excluded here.
const ADDABLE_BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: "header", label: "سرتیتر" },
  { type: "txt", label: "پاراگراف" },
  { type: "list", label: "لیست" },
  { type: "quote", label: "نقل قول" },
  { type: "image", label: "تصویر" },
  { type: "product", label: "محصول" },
];

function newImageSlotId(): string {
  return `img-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlock(type: BlockType, order: number): BlogBlock {
  if (type === "list") return { type, order, items: [""], ordered: false };
  if (type === "quote") return { type, order, text: "", attribution: "" };
  if (type === "image") return { type, order, imageSlotId: newImageSlotId(), alt: "", caption: "" };
  if (type === "product") return { type, order, productDescription: "" };
  return { type, order, text: "" };
}

// Converts a block to a different type, carrying over whatever content
// reasonably maps across (e.g. text between header/txt/quote, or text into
// the first list item), so switching type in the UI doesn't lose input.
function convertBlockType(block: BlogBlock, newType: BlockType): BlogBlock {
  if (block.type === newType) return block;
  const order = block.order;
  switch (newType) {
    case "header":
    case "txt":
      return { type: newType, order, text: block.text || (block.items || []).join("\n") || block.productDescription || "" };
    case "quote":
      return { type: newType, order, text: block.text || "", attribution: block.attribution || "" };
    case "list":
      return {
        type: newType,
        order,
        items: block.items?.length ? block.items : block.text ? [block.text] : [""],
        ordered: block.ordered || false,
      };
    case "image":
      return { type: newType, order, imageSlotId: block.imageSlotId || newImageSlotId(), alt: block.alt || "", caption: block.caption || "" };
    case "product":
      return { type: newType, order, productDescription: block.productDescription || block.text || "" };
    default:
      return { type: newType, order, text: block.text || "" };
  }
}

// Mirrors the backend's ValidateBlockOrder / ValidateHeadingHierarchy /
// ValidateTextBlockNoHTML (services/blog_validator.go) so obviously-invalid
// edits are caught before a round trip to the server.
function validateBlocksClientSide(blocks: BlogBlock[]): string | null {
  if (blocks.length === 0) return "حداقل یک بخش لازم است";
  if (blocks[0].type !== "title") return "اولین بخش باید عنوان مقاله باشد";

  let titleCount = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "title") {
      titleCount++;
      if (titleCount > 1) return "فقط یک بلوک عنوان مجاز است";
    }
    if (b.type === "header" && i > 0 && blocks[i - 1].type === "header") {
      return `بخش ${i + 1}: دو سرتیتر پشت سر هم مجاز نیست`;
    }
    if (b.type === "image") {
      if (i === 0 || i === blocks.length - 1) {
        return `بخش ${i + 1}: تصویر نمی‌تواند اولین یا آخرین بخش باشد`;
      }
      if (i > 0 && blocks[i - 1].type === "image") {
        return `بخش ${i + 1}: دو تصویر پشت سر هم مجاز نیست`;
      }
    }
    if ((b.type === "title" || b.type === "header" || b.type === "txt" || b.type === "quote") && b.text) {
      if (/[<>]/.test(b.text)) return `بخش ${i + 1}: نباید شامل تگ HTML باشد`;
      if (/[*_`]/.test(b.text)) return `بخش ${i + 1}: نباید شامل نشانه‌گذاری مارک‌داون باشد`;
    }
    if (b.type === "list") {
      for (const item of b.items || []) {
        if (/[<>]/.test(item)) return `بخش ${i + 1}: آیتم لیست نباید شامل تگ HTML باشد`;
        if (/[*_`]/.test(item)) return `بخش ${i + 1}: آیتم لیست نباید شامل نشانه‌گذاری مارک‌داون باشد`;
      }
    }
  }
  return null;
}

function AddSectionRow({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [type, setType] = useState<BlockType>("txt");
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-dashed border-gray-300" />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as BlockType)}
        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700"
      >
        {ADDABLE_BLOCK_TYPES.map((o) => (
          <option key={o.type} value={o.type}>{o.label}</option>
        ))}
      </select>
      <Button variant="outline" size="sm" onClick={() => onAdd(type)}>
        + افزودن بخش
      </Button>
      <div className="flex-1 border-t border-dashed border-gray-300" />
    </div>
  );
}

interface PreviewStageProps {
  run: BlogPipelineRun;
  post: BlogPost | null;
  media: BlogMedia[];
  onApprove: () => void;
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

export default function PreviewStage({ run, post, media, onApprove, onPublish, onUnpublish, onArchive }: PreviewStageProps) {
  const { uploadMedia, deleteMedia, updateBlocks, fetchRun } = useBlogAdminStore();
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<BlogBlock[]>([]);

  // --- Writing output (blocks) ---
  const writingExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write"),
    [run.executions]
  );
  const writingOutput = useMemo(
    () => normalizeOutput(writingExec?.parsedOutput, writingExec?.rawResponse),
    [writingExec?.parsedOutput, writingExec?.rawResponse]
  );
  // Prefer the live post's blocks (reflects product-block resolution) over the
  // frozen write-stage execution snapshot, once the post actually exists.
  const blocks: BlogBlock[] = useMemo(
    () => (post?.blocks?.length ? post.blocks : (writingOutput?.blocks as BlogBlock[]) || []),
    [post?.blocks, writingOutput]
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

  // Build the full list of image upload slots: prompts-stage output first,
  // then any image block present in the article that isn't covered by it yet
  // (e.g. one the admin added manually via the content editor).
  const imageSlots: ImageSlot[] = useMemo(() => {
    const slots: ImageSlot[] = [];
    const seenSlotIds = new Set<string>();
    const output = promptsOutput;

    if (output) {
      // Cover prompt
      const coverPrompt = output.cover_prompt;
      if (coverPrompt && typeof coverPrompt === "object" && !Array.isArray(coverPrompt)) {
        let cp = coverPrompt as Record<string, unknown>;
        if ("Key" in cp && "Value" in cp) cp = (cp.Value as Record<string, unknown>) || {};
        slots.push({ slot: "cover", label: `کاور — ${(cp.prompt as string || "").slice(0, 60)}` });
        seenSlotIds.add("cover");
      } else if (typeof coverPrompt === "string" && coverPrompt) {
        slots.push({ slot: "cover", label: `کاور — ${coverPrompt.slice(0, 60)}` });
        seenSlotIds.add("cover");
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
          seenSlotIds.add(slotId);
        }
      }
    }

    // Any image block not already covered by a prompt (manually added ones,
    // or all of them if the prompts stage hasn't produced output at all).
    for (const b of blocks) {
      if (b.type !== "image") continue;
      const slotId = b.imageSlotId || `img-${b.order}`;
      if (seenSlotIds.has(slotId)) continue;
      seenSlotIds.add(slotId);
      slots.push({ slot: slotId, label: `تصویر — ${b.alt || slotId}` });
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

  // --- Content editing (edit / add section / remove section) ---
  // Edits operate on the real `blocks` (post.blocks or the write-stage
  // snapshot), not `resolvedBlocks`, since the latter injects synthetic
  // placeholder image blocks purely for display.
  const startEditing = useCallback(() => {
    setDraftBlocks(blocks.map((b) => ({ ...b, items: b.items ? [...b.items] : undefined })));
    setIsEditing(true);
  }, [blocks]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setDraftBlocks([]);
  }, []);

  const updateBlockAt = useCallback((index: number, patch: Partial<BlogBlock>) => {
    setDraftBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }, []);

  const updateBlockType = useCallback((index: number, newType: BlockType) => {
    setDraftBlocks((prev) => prev.map((b, i) => (i === index ? convertBlockType(b, newType) : b)));
  }, []);

  const removeBlockAt = useCallback((index: number) => {
    setDraftBlocks((prev) => {
      if (prev[index]?.type === "title") {
        toast.error("بلوک عنوان قابل حذف نیست");
        return prev;
      }
      return prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const addBlockAfter = useCallback((index: number, type: BlockType) => {
    setDraftBlocks((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, makeBlock(type, index + 1));
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const updateListItem = useCallback((blockIndex: number, itemIndex: number, value: string) => {
    setDraftBlocks((prev) => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const items = [...(b.items || [])];
      items[itemIndex] = value;
      return { ...b, items };
    }));
  }, []);

  const addListItem = useCallback((blockIndex: number) => {
    setDraftBlocks((prev) => prev.map((b, i) => (i === blockIndex ? { ...b, items: [...(b.items || []), ""] } : b)));
  }, []);

  const removeListItem = useCallback((blockIndex: number, itemIndex: number) => {
    setDraftBlocks((prev) => prev.map((b, i) => (
      i === blockIndex ? { ...b, items: (b.items || []).filter((_, ii) => ii !== itemIndex) } : b
    )));
  }, []);

  const handleSaveBlocks = useCallback(async () => {
    const validationError = validateBlocksClientSide(draftBlocks);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!post) {
      toast.error("مقاله هنوز ذخیره نشده است");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await updateBlocks(post.id, draftBlocks);
      if (ok) {
        toast.success("تغییرات ذخیره شد");
        setIsEditing(false);
        setDraftBlocks([]);
        await fetchRun(run.id);
      } else {
        toast.error(useBlogAdminStore.getState().error || "خطا در ذخیره تغییرات");
      }
    } finally {
      setIsSaving(false);
    }
  }, [draftBlocks, post, updateBlocks, fetchRun, run.id]);

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
        await deleteMedia(run.postId, existing.id);
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
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                انصراف
              </Button>
              <Button onClick={handleSaveBlocks} isLoading={isSaving}>
                ذخیره تغییرات
              </Button>
            </>
          ) : (
            <>
              {post && (
                <Button variant="outline" onClick={startEditing}>
                  ویرایش محتوا
                </Button>
              )}
              {run.status === "media_pending" && (
                <Button onClick={onApprove} disabled={uploadedCount < imageSlots.length || uploadedCount === 0}>
                  تایید و آماده‌سازی
                </Button>
              )}
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
            </>
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
                            if (!run.postId) return;
                            const ok = await deleteMedia(run.postId, existing.id);
                            if (ok) {
                              toast.success("حذف شد");
                            } else {
                              toast.error(useBlogAdminStore.getState().error || "خطا در حذف تصویر");
                            }
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

        {isEditing ? (
          <div className="space-y-3">
            {draftBlocks.map((block, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      بخش {index + 1}
                    </span>
                    {block.type === "title" ? (
                      <span className="text-xs font-bold text-voxcina-blue bg-primary-100 px-2 py-1 rounded">
                        {BLOCK_TYPE_LABELS.title}
                      </span>
                    ) : (
                      <select
                        value={block.type}
                        onChange={(e) => updateBlockType(index, e.target.value as BlockType)}
                        className="text-xs font-bold text-voxcina-blue bg-primary-100 border-0 rounded px-2 py-1 cursor-pointer"
                      >
                        {ADDABLE_BLOCK_TYPES.map((o) => (
                          <option key={o.type} value={o.type}>{o.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {block.type !== "title" && (
                    <Button variant="danger" size="sm" onClick={() => removeBlockAt(index)}>
                      حذف بخش
                    </Button>
                  )}
                </div>

                {(block.type === "title" || block.type === "header") && (
                  <input
                    type="text"
                    value={block.text || ""}
                    onChange={(e) => updateBlockAt(index, { text: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold"
                    placeholder="متن..."
                  />
                )}

                {block.type === "txt" && (
                  <textarea
                    value={block.text || ""}
                    onChange={(e) => updateBlockAt(index, { text: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed"
                    placeholder="متن پاراگراف..."
                  />
                )}

                {block.type === "quote" && (
                  <div className="space-y-2">
                    <textarea
                      value={block.text || ""}
                      onChange={(e) => updateBlockAt(index, { text: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="متن نقل قول..."
                    />
                    <input
                      type="text"
                      value={block.attribution || ""}
                      onChange={(e) => updateBlockAt(index, { attribution: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
                      placeholder="منبع / گوینده (اختیاری)"
                    />
                  </div>
                )}

                {block.type === "list" && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!block.ordered}
                        onChange={(e) => updateBlockAt(index, { ordered: e.target.checked })}
                      />
                      لیست شماره‌دار
                    </label>
                    {(block.items || []).map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateListItem(index, itemIndex, e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeListItem(index, itemIndex)}>
                          حذف
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addListItem(index)}>
                      + افزودن آیتم
                    </Button>
                  </div>
                )}

                {block.type === "image" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">جایگاه تصویر: {block.imageSlotId}</p>
                    <input
                      type="text"
                      value={block.alt || ""}
                      onChange={(e) => updateBlockAt(index, { alt: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                      placeholder="متن جایگزین تصویر"
                    />
                    <input
                      type="text"
                      value={block.caption || ""}
                      onChange={(e) => updateBlockAt(index, { caption: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                      placeholder="زیرنویس تصویر (اختیاری)"
                    />
                  </div>
                )}

                {block.type === "product" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.productDescription || ""}
                      onChange={(e) => updateBlockAt(index, { productDescription: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="توضیح محصول برای جستجو (مثلاً: پیراهن آبی کژوال)"
                    />
                    {block.productId ? (
                      <p className="text-xs text-green-600">محصول انتخاب‌شده: {block.productName}</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        انتخاب محصول واقعی پس از ذخیره، از مرحله «محتوا» انجام می‌شود.
                      </p>
                    )}
                  </div>
                )}

                <AddSectionRow onAdd={(type) => addBlockAfter(index, type)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="prose max-w-none">
            {resolvedBlocks.map((block, index) => (
              <div key={block.id || index} className="mb-4">
                {block.type === "title" && (
                  <h1 className="text-3xl font-bold text-voxcina-blue">{block.text}</h1>
                )}
                {block.type === "header" && (
                  <h2 className="text-2xl font-bold text-voxcina-blue mt-6 mb-3">{block.text}</h2>
                )}
                {block.type === "txt" && (
                  <p className="text-gray-900 leading-relaxed">{block.text}</p>
                )}
                {block.type === "list" && (
                  block.ordered ? (
                    <ol className="list-decimal pr-5 space-y-1 text-gray-900 leading-relaxed">
                      {(block.items || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul className="list-disc pr-5 space-y-1 text-gray-900 leading-relaxed">
                      {(block.items || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )
                )}
                {block.type === "quote" && (
                  <blockquote className="border-r-4 border-primary-300 bg-secondary-100/60 rounded-xl p-4">
                    <p className="text-voxcina-blue italic font-medium leading-relaxed">{block.text}</p>
                    {block.attribution && (
                      <footer className="text-sm text-gray-500 mt-2">— {block.attribution}</footer>
                    )}
                  </blockquote>
                )}
                {block.type === "product" && (
                  block.productId ? (
                    <BlogProductCard block={block} />
                  ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
                      محصول هنوز انتخاب نشده — «{block.productDescription}»
                    </div>
                  )
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
        )}

        {!isEditing && tags.length > 0 && (
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
