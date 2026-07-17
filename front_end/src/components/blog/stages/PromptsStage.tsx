"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { BlogPipelineRun } from "@/types/blog";

interface PromptsStageProps {
  run: BlogPipelineRun;
  onApprove: () => void;
  onTriggerPrompts: () => void;
}

interface ImagePrompt {
  id?: string;
  slot: string;
  prompt: string;
  alt_text?: string;
  caption?: string;
}

function normalizePromptsOutput(parsedOutput: unknown, rawResponse?: string): Record<string, unknown> | undefined {
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

export default function PromptsStage({ run, onApprove, onTriggerPrompts }: PromptsStageProps) {
  const promptsExec = useMemo(
    () => run.executions?.find((e) => e.stage === "prompts"),
    [run.executions]
  );
  const allPrompts: ImagePrompt[] = useMemo(() => {
    const output = normalizePromptsOutput(promptsExec?.parsedOutput, promptsExec?.rawResponse);
    
    const prompts: ImagePrompt[] = [];
    
    if (output) {
      const coverPrompt = output.cover_prompt as string | undefined;
      const inlinePrompts = (output.inline_prompts as ImagePrompt[]) || [];
      
      if (coverPrompt) {
        prompts.push({ slot: "cover", prompt: coverPrompt, id: "cover" });
      }
      prompts.push(...inlinePrompts);
    }
    
    return prompts;
  }, [promptsExec]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">پرامپتهای تصویر</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {["prompts"].includes(run.status)
              ? "در حال تولید..."
              : ["prompts_approved", "media_pending", "ready", "published"].includes(run.status)
                ? "تولید تکمیل شد"
                : "هنوز شروع نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onTriggerPrompts}
            disabled={!["content_approved", "prompts_approved"].includes(run.status)}
          >
            شروع تولید پرامپت
          </Button>
          <Button onClick={onApprove} disabled={run.status !== "prompts_approved"}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {allPrompts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هنوز پرامپتی تولید نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {allPrompts.map((prompt, index) => (
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
