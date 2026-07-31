"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { BlogPipelineRun, BlogResearchSource } from "@/types/blog";

interface Finding {
  claim?: string;
  evidence?: string;
  confidence?: number;
}

interface Outline {
  title?: string;
  sections?: string[];
  key_points?: string[];
}

interface ResearchStageProps {
  run: BlogPipelineRun;
  sources: BlogResearchSource[];
  onApprove: () => void;
  onTriggerResearch: () => void;
}

export default function ResearchStage({ run, sources, onApprove, onTriggerResearch }: ResearchStageProps) {
  const isResearching = run.status === "researching";
  const isApproved = run.status === "research_approved";

  const researchExec = useMemo(
    () => run.executions?.find((e) => e.stage === "research" && e.status === "completed"),
    [run.executions]
  );
  // The research execution stores a ResearchSnapshot ({ output, sources, ... }),
  // so the actual findings/outline/etc. live under parsedOutput.output, not
  // parsedOutput directly. Fall back to a flat shape for resilience.
  const parsedOutput = researchExec?.parsedOutput;
  const researchOutput = (parsedOutput?.output ?? parsedOutput) as Record<string, unknown> | undefined;
  const findings = (researchOutput?.findings as Finding[]) || [];
  const outline = researchOutput?.outline as Outline | undefined;
  const category = researchOutput?.recommended_category as string | undefined;
  const tags = (researchOutput?.recommended_tags as string[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">تحقیق</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {isResearching
              ? "در حال تحقیق..."
              : isApproved
                ? "تحقیق تکمیل شد - آماده تایید"
                : "هنوز شروع نشده"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onTriggerResearch}
            disabled={isResearching}
          >
            شروع مجدد تحقیق
          </Button>
          <Button
            onClick={onApprove}
            disabled={!isApproved}
          >
            تایید و ادامه
          </Button>
        </div>
      </div>

      {isResearching && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-voxcina-blue mb-2"></div>
          <p className="text-gray-500">در حال جمعآوری اطلاعات...</p>
        </div>
      )}

      {!isResearching && findings.length === 0 && sources.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          هنوز منابعی جمعآوری نشده است
        </div>
      )}

      {findings.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-3">یافتههای تحقیق ({findings.length})</h4>
          <div className="space-y-3">
            {findings.map((f, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="text-gray-900">{f.claim}</p>
                {f.evidence && (
                  <p className="text-sm text-gray-600 mt-1">منبع: {f.evidence}</p>
                )}
                {f.confidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-voxcina-blue h-1.5 rounded-full"
                        style={{ width: `${Math.round(f.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(f.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-900 mb-3">منابع ({sources.length})</h4>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div key={source.id || index} className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900">{source.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                {source.snippet && (
                  <p className="text-sm text-gray-700 mt-2">{source.snippet}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {outline && (outline.sections?.length ?? 0) > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-bold text-gray-900 mb-2">ساختار پیشنهادی مقاله</h4>
          {outline.title && <p className="text-sm text-gray-700 mb-2">عنوان: {outline.title}</p>}
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {outline.sections!.map((section, index) => (
              <li key={index}>{section}</li>
            ))}
          </ul>
          {outline.key_points && outline.key_points.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">نکات کلیدی:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {outline.key_points.map((kp, i) => <li key={i}>{kp}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {(category || tags.length > 0) && (
        <div className="border-t pt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          {category && <span>دسته پیشنهادی: <strong>{category}</strong></span>}
          {tags.length > 0 && <span>برچسبها: {tags.join("، ")}</span>}
        </div>
      )}
    </div>
  );
}
