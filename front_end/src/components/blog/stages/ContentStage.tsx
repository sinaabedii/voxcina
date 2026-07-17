"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { BlogPipelineRun, BlogBlock } from "@/types/blog";

interface ContentStageProps {
  run: BlogPipelineRun;
  onApprove: () => void;
  onTriggerWriting: () => void;
}

export default function ContentStage({ run, onApprove, onTriggerWriting }: ContentStageProps) {
  const writingExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write"),
    [run.executions]
  );
  const blocks: BlogBlock[] = useMemo(
    () => (writingExec?.parsedOutput?.blocks as BlogBlock[]) || [],
    [writingExec]
  );
  const excerpt = useMemo(
    () => (writingExec?.parsedOutput?.excerpt as string) || "",
    [writingExec]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">محتوای مقاله</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {["writing"].includes(run.status)
              ? "در حال نگارش..."
              : ["content_approved", "prompts", "prompts_approved", "media_pending", "ready", "published"].includes(run.status)
                ? "نگارش تکمیل شد"
                : "هنوز شروع نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTriggerWriting} disabled={run.status !== "research_approved"}>
            شروع نگارش
          </Button>
          <Button onClick={onApprove} disabled={run.status !== "content_approved"}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هنوز محتوایی تولید نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div key={block.id || index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  بلوک {index + 1}
                </span>
                <span className="text-xs font-bold text-voxcina-blue bg-primary-100 px-2 py-1 rounded">
                  {block.type}
                </span>
              </div>
              {block.type === "image" ? (
                <div className="text-sm text-gray-600">
                  <p>جایگاه تصویر: {block.imageSlotID}</p>
                  {block.alt && <p className="mt-1">متن جایگزین: {block.alt}</p>}
                </div>
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{block.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {excerpt && (
        <div className="border-t pt-4">
          <h4 className="font-bold text-gray-900 mb-2">خلاصه مقاله</h4>
          <p className="text-gray-700">{excerpt}</p>
        </div>
      )}
    </div>
  );
}
