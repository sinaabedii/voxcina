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
  slot?: string;
  prompt: string;
  alt_text?: string;
  caption?: string;
  aspect_ratio?: string;
  composition?: string;
  suggested_slot_id?: string;
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

  const isGenerating = run.status === "prompts";
  const hasCompletedExecution = promptsExec?.status === "completed";
  const isFailed = promptsExec?.status === "failed" && !isGenerating;

  const allPrompts: ImagePrompt[] = useMemo(() => {
    const output = normalizePromptsOutput(promptsExec?.parsedOutput, promptsExec?.rawResponse);
    if (!output) return [];

    const prompts: ImagePrompt[] = [];

    // Handle PromptAgent format: {cover_prompt: ImagePrompt, inline_prompts: ImagePrompt[]}
    const coverPrompt = output.cover_prompt;
    if (coverPrompt && typeof coverPrompt === "object") {
      const cp = coverPrompt as Record<string, unknown>;
      prompts.push({
        id: "cover",
        slot: "cover",
        prompt: (cp.prompt as string) || "",
        alt_text: (cp.alt_text as string) || "",
        caption: (cp.caption as string) || "",
        aspect_ratio: (cp.aspect_ratio as string) || "",
        composition: (cp.composition as string) || "",
      });
    } else if (typeof coverPrompt === "string" && coverPrompt) {
      prompts.push({ id: "cover", slot: "cover", prompt: coverPrompt });
    }

    // Handle inline_prompts array
    const inlinePrompts = output.inline_prompts;
    if (Array.isArray(inlinePrompts)) {
      for (let i = 0; i < inlinePrompts.length; i++) {
        const ip = inlinePrompts[i] as Record<string, unknown>;
        prompts.push({
          id: (ip.suggested_slot_id as string) || `img-${i + 1}`,
          slot: (ip.suggested_slot_id as string) || `img-${i + 1}`,
          prompt: (ip.prompt as string) || "",
          alt_text: (ip.alt_text as string) || "",
          caption: (ip.caption as string) || "",
          aspect_ratio: (ip.aspect_ratio as string) || "",
          composition: (ip.composition as string) || "",
        });
      }
    }

    // Fallback: handle flat array format [{slot, prompt}] from legacy worker
    if (prompts.length === 0 && Array.isArray(output)) {
      for (const item of output) {
        const obj = item as Record<string, unknown>;
        prompts.push({
          id: (obj.slot as string) || undefined,
          slot: (obj.slot as string) || undefined,
          prompt: (obj.prompt as string) || "",
        });
      }
    }

    return prompts;
  }, [promptsExec]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">پرامپتهای تصویر</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {isGenerating
              ? "در حال تولید..."
              : hasCompletedExecution
                ? "تولید تکمیل شد"
                : isFailed
                  ? "تولید ناموفق بود"
                  : "هنوز شروع نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onTriggerPrompts}
            disabled={isGenerating}
          >
            {hasCompletedExecution ? "تولید مجدد" : "شروع تولید پرامپت"}
          </Button>
          <Button onClick={onApprove} disabled={!hasCompletedExecution || run.status !== "prompts_approved"}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {isGenerating && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-voxcina-blue mb-2"></div>
          <p className="text-gray-500">در حال تولید پرامپتهای تصویر...</p>
        </div>
      )}

      {isFailed && promptsExec?.error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-bold text-red-700 mb-1">خطا در تولید پرامپت:</p>
          <p className="text-sm text-red-600">{promptsExec.error}</p>
        </div>
      )}

      {!isGenerating && allPrompts.length === 0 && !isFailed && !hasCompletedExecution && (
        <div className="text-center py-8 text-gray-500">
          هنوز پرامپتی تولید نشده است
        </div>
      )}

      {allPrompts.length > 0 && (
        <div className="space-y-4">
          {allPrompts.map((prompt, index) => (
            <div key={prompt.id || index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  پرامپت {index + 1}
                </span>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  {prompt.slot || "—"}
                </span>
                {prompt.aspect_ratio && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {prompt.aspect_ratio}
                  </span>
                )}
                {prompt.composition && (
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                    {prompt.composition}
                  </span>
                )}
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
