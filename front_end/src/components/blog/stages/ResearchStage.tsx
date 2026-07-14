"use client";

import Button from "@/components/ui/Button";
import { BlogPipelineRun, BlogResearchSource } from "@/types/blog";

interface ResearchStageProps {
  run: BlogPipelineRun;
  sources: BlogResearchSource[];
  onApprove: () => void;
  onTriggerResearch: () => void;
}

export default function ResearchStage({ run, sources, onApprove, onTriggerResearch }: ResearchStageProps) {
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

      {run.research_outline && (
        <div className="border-t pt-4">
          <h4 className="font-bold text-gray-900 mb-2">ساختار پیشنهادی مقاله</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {run.research_outline.sections?.map((section, index) => (
              <li key={index}>{section}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
