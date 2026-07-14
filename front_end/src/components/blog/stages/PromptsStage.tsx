"use client";

import Button from "@/components/ui/Button";
import { BlogPipelineRun } from "@/types/blog";

interface PromptsStageProps {
  run: BlogPipelineRun;
  onApprove: () => void;
  onTriggerPrompts: () => void;
}

export default function PromptsStage({ run, onApprove, onTriggerPrompts }: PromptsStageProps) {
  const prompts = run.image_prompts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">پرامپتهای تصویر</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {run.status === "prompts" ? "در حال تولید..." : "تولید تکمیل شد"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTriggerPrompts} disabled={run.status !== "content_approved"}>
            شروع تولید پرامپت
          </Button>
          <Button onClick={onApprove} disabled={run.status !== "prompts_approved"}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هنوز پرامپتی تولید نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={prompt.id || index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  پرامپت {index + 1}
                </span>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  {prompt.slot}
                </span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap mb-2">{prompt.prompt}</p>
              {prompt.alt_text && (
                <p className="text-sm text-gray-600">
                  <strong>متن جایگزین:</strong> {prompt.alt_text}
                </p>
              )}
              {prompt.caption && (
                <p className="text-sm text-gray-600">
                  <strong>کپشن:</strong> {prompt.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
