"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { BlogPipelineRun, BlogResearchSource } from "@/types/blog";

interface ResearchStageProps {
  run: BlogPipelineRun;
  sources: BlogResearchSource[];
  onApprove: () => void;
  onTriggerResearch: () => void;
}

export default function ResearchStage({ run, sources, onApprove, onTriggerResearch }: ResearchStageProps) {
  const researchExec = useMemo(
    () => run.executions?.find((e) => e.stage === "research"),
    [run.executions]
  );
  const parsedOutput = researchExec?.parsedOutput;
  const outline = parsedOutput?.outline as { title?: string; sections?: string[]; subsections?: string[]; key_points?: string[] } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">منابع تحقیق</h3>
          <p className="text-sm text-gray-600">
            وضعیت: {run.status === "researching" ? "در حال تحقیق..." : "تحقیق تکمیل شد"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTriggerResearch} disabled={run.status !== "brief"}>
            شروع مجدد تحقیق
          </Button>
          <Button onClick={onApprove} disabled={run.status !== "research_approved"}>
            تایید و ادامه
          </Button>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هنوز منابعی جمعآوری نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source, index) => (
            <div key={source.id || index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{source.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                  {source.snippet && (
                    <p className="text-sm text-gray-700 mt-2">{source.snippet}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  منبع {index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {outline?.sections && outline.sections.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-bold text-gray-900 mb-2">ساختار پیشنهادی مقاله</h4>
          {outline.title && <p className="text-sm text-gray-700 mb-2">عنوان: {outline.title}</p>}
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {outline.sections.map((section, index) => (
              <li key={index}>{section}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
