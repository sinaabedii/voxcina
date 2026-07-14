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
          <label className="block mb-1 font-medium text-gray-700">Topic</label>
          <p className="text-gray-900">{run.topic}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Category</label>
          <p className="text-gray-900">{run.category || "None"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Target Audience</label>
          <p className="text-gray-900">{run.target_audience || "General"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Tone</label>
          <p className="text-gray-900 capitalize">{run.tone || "professional"}</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Desired Length</label>
          <p className="text-gray-900">{run.desired_length || 1000} words</p>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Keywords</label>
          <p className="text-gray-900">{run.keywords?.join(", ") || "None"}</p>
        </div>
      </div>

      {run.additional_notes && (
        <div>
          <label className="block mb-1 font-medium text-gray-700">Additional Notes</label>
          <p className="text-gray-900 whitespace-pre-wrap">{run.additional_notes}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onTriggerResearch} disabled={run.status !== "brief"}>
          Start Research
        </Button>
      </div>
    </div>
  );
}
