"use client";

import Button from "@/components/ui/Button";
import { BlogPipelineRun } from "@/types/blog";

interface BriefStageProps {
  run: BlogPipelineRun;
  onTriggerResearch: () => void;
}

export default function BriefStage({ run, onTriggerResearch }: BriefStageProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium text-gray-700">موضوع</label>
          <p className="text-gray-900">{run.topic}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">دسته</label>
          <p className="text-gray-900">{run.category || "تعیین نشده"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">مخاطب هدف</label>
          <p className="text-gray-900">{run.targetAudience || "عمومی"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">لحن</label>
          <p className="text-gray-900">{run.tone || "professional"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">طول مطلوب</label>
          <p className="text-gray-900">{run.desiredLength || 1000} کلمه</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">کلمات کلیدی</label>
          <p className="text-gray-900">{run.keywords?.join("، ") || "ندارد"}</p>
        </div>
      </div>

      {run.additionalNotes && (
        <div>
          <label className="block mb-1 font-medium text-gray-700">یادداشتهای اضافی</label>
          <p className="text-gray-900 whitespace-pre-wrap">{run.additionalNotes}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onTriggerResearch} disabled={run.status !== "brief"}>
          شروع تحقیق
        </Button>
      </div>
    </div>
  );
}
