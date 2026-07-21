"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { BlogPipelineRun, BlogBlock } from "@/types/blog";

interface ContentStageProps {
  run: BlogPipelineRun;
  onApprove: () => void;
  onTriggerWriting: () => void;
}

// The backend sometimes stores the writer output as a JSON string instead of
// a parsed object. Normalize it so the UI always renders structured blocks.
// Falls back to rawResponse if parsedOutput is empty.
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

export default function ContentStage({ run, onApprove, onTriggerWriting }: ContentStageProps) {
  const isWriting = run.status === "writing";
  const isApproved = run.status === "content_approved";
  const isFailed = !isWriting && !isApproved && run.status !== "brief";

  const writingExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write" && e.status === "completed"),
    [run.executions]
  );
  const failedExec = useMemo(
    () => run.executions?.find((e) => e.stage === "write" && e.status === "failed"),
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
  const excerpt = useMemo(
    () => (output?.excerpt as string) || "",
    [output]
  );
  const rawContent = useMemo(() => {
    if (output?.content && typeof output.content === "string") {
      return output.content;
    }
    if (typeof writingExec?.parsedOutput === "string") {
      return writingExec.parsedOutput;
    }
    if (writingExec?.rawResponse) {
      return writingExec.rawResponse;
    }
    return "";
  }, [output, writingExec?.parsedOutput, writingExec?.rawResponse]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">محتوای مقاله</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {isWriting
              ? "در حال نگارش..."
              : isApproved
                ? "نگارش تکمیل شد - آماده تایید"
                : failedExec
                  ? "نگارش ناموفق بود"
                  : "هنوز شروع نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTriggerWriting}>
            {failedExec ? "شروع مجدد نگارش" : "شروع نگارش"}
          </Button>
          <Button onClick={onApprove} disabled={!isApproved}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {failedExec && failedExec.error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-bold text-red-700 mb-1">خطا در نگارش:</p>
          <p className="text-sm text-red-600">{failedExec.error}</p>
        </div>
      )}

      {isWriting && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-voxcina-blue mb-2"></div>
          <p className="text-gray-500">در حال تولید محتوا...</p>
        </div>
      )}

      {!isWriting && blocks.length === 0 && !rawContent && (
        <div className="text-center py-8 text-gray-500">
          هنوز محتوایی تولید نشده است
        </div>
      )}

      {blocks.length > 0 && (
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
                  <p>جایگاه تصویر: {block.imageSlotId}</p>
                  {block.alt && <p className="mt-1">متن جایگزین: {block.alt}</p>}
                </div>
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{block.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isWriting && blocks.length === 0 && rawContent && (
        <div className="border rounded-lg p-6">
          <h4 className="font-bold text-gray-900 mb-3">متن مقاله</h4>
          <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">{rawContent}</div>
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
