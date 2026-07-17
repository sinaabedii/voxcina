"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { BlogPipelineRun, BlogBlock } from "@/types/blog";

interface PreviewStageProps {
  run: BlogPipelineRun;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}

function normalizeWriterOutput(parsedOutput: unknown, rawResponse?: string): Record<string, unknown> | undefined {
  if (parsedOutput && typeof parsedOutput === "object") {
    return parsedOutput as Record<string, unknown>;
  }
  if (typeof parsedOutput === "string" && parsedOutput.trim()) {
    try {
      return JSON.parse(parsedOutput) as Record<string, unknown>;
    } catch {
      return { content: parsedOutput };
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

export default function PreviewStage({ run, onPublish, onUnpublish, onArchive }: PreviewStageProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">پیشنمایش و انتشار</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {run.status === "published" ? "منتشر شده" : "آماده انتشار"}
          </p>
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
          {blocks.map((block, index) => (
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
                    <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center text-gray-500">
                      تصویر آپلود نشده
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
