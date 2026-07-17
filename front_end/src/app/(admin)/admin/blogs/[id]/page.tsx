"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { BlogPipelineRun, BlogBlock, BlogResearchSource } from "@/types/blog";
import { toast } from "react-hot-toast";
import BriefStage from "@/components/blog/stages/BriefStage";
import ResearchStage from "@/components/blog/stages/ResearchStage";
import ContentStage from "@/components/blog/stages/ContentStage";
import PromptsStage from "@/components/blog/stages/PromptsStage";
import PreviewStage from "@/components/blog/stages/PreviewStage";

const STAGES = [
  { id: "brief", label: "خلاصه", icon: "📝" },
  { id: "research", label: "تحقیق", icon: "🔍" },
  { id: "content", label: "محتوا", icon: "✍️" },
  { id: "prompts", label: "پرامپت", icon: "🎨" },
  { id: "preview", label: "پیشنمایش", icon: "👁️" },
];

export default function BlogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runID = params.id as string;

  const {
    currentRun,
    fetchRun,
    deleteRun,
    triggerResearch,
    approveResearch,
    triggerWriting,
    approveContent,
    triggerPrompts,
    approvePrompts,
    publishPost,
    unpublishPost,
    archivePost,
    isLoading,
  } = useBlogAdminStore();

  const [currentStage, setCurrentStage] = useState("brief");
  const [researchSources, setResearchSources] = useState<BlogResearchSource[]>([]);

  useEffect(() => {
    if (runID) {
      fetchRun(runID);
    }
  }, [runID, fetchRun]);

  useEffect(() => {
    if (currentRun) {
      // Map run status to stage
      const statusToStage: Record<string, string> = {
        brief: "brief",
        researching: "research",
        research_approved: "research",
        writing: "content",
        content_approved: "content",
        prompts: "prompts",
        prompts_approved: "prompts",
        media_pending: "preview",
        ready: "preview",
        published: "preview",
        archived: "preview",
      };
      setCurrentStage(statusToStage[currentRun.status] || "brief");

      // Load research sources from API response
      if (currentRun.sources) {
        setResearchSources(currentRun.sources);
      }
    }
  }, [currentRun]);

  const handleTriggerResearch = async () => {
    const success = await triggerResearch(runID);
    if (success) {
      toast.success("تحقیق شروع شد");
    } else {
      toast.error("خطا در شروع تحقیق");
    }
  };

  const handleApproveResearch = async () => {
    const success = await approveResearch(runID);
    if (success) {
      toast.success("تحقیق تایید شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در تایید تحقیق");
    }
  };

  const handleTriggerWriting = async () => {
    const success = await triggerWriting(runID);
    if (success) {
      toast.success("نگارش شروع شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در شروع نگارش");
    }
  };

  const handleApproveContent = async () => {
    const success = await approveContent(runID);
    if (success) {
      toast.success("محتوا تایید شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در تایید محتوا");
    }
  };

  const handleTriggerPrompts = async () => {
    const success = await triggerPrompts(runID);
    if (success) {
      toast.success("تولید پرامپت شروع شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در شروع تولید پرامپت");
    }
  };

  const handleApprovePrompts = async () => {
    const success = await approvePrompts(runID);
    if (success) {
      toast.success("پرامپت تایید شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در تایید پرامپت");
    }
  };

  const handlePublish = async () => {
    if (!currentRun?.postId) {
      toast.error("مقاله یافت نشد");
      return;
    }
    const success = await publishPost(currentRun.postId);
    if (success) {
      toast.success("مقاله منتشر شد");
      await fetchRun(runID);
    } else {
      toast.error("خطا در انتشار مقاله");
    }
  };

  const handleUnpublish = async () => {
    if (!currentRun?.postId) return;
    const success = await unpublishPost(currentRun.postId);
    if (success) {
      toast.success("مقاله غیرانتشار شد");
      await fetchRun(runID);
    }
  };

  const handleArchive = async () => {
    if (!currentRun?.postId) return;
    const success = await archivePost(currentRun.postId);
    if (success) {
      toast.success("مقاله بایگانی شد");
      await fetchRun(runID);
    }
  };

  const handleDelete = async () => {
    if (!confirm("آیا از حذف این کارگاه اطمینان دارید؟ تمام اطلاعات مرتبط حذف خواهد شد.")) return;
    const success = await deleteRun(runID);
    if (success) {
      toast.success("کارگاه حذف شد");
      router.push("/admin/blogs");
    } else {
      toast.error("خطا در حذف کارگاه");
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center">در حال بارگذاری...</div>;
  }

  if (!currentRun) {
    return <div className="py-8 text-center">کارگاه یافت نشد</div>;
  }

  const canAdvance = () => {
    switch (currentStage) {
      case "brief":
        return currentRun.status === "brief";
      case "research":
        return currentRun.status === "research_approved";
      case "content":
        return currentRun.status === "content_approved";
      case "prompts":
        return currentRun.status === "prompts_approved";
      case "preview":
        return currentRun.status === "ready" || currentRun.status === "published";
      default:
        return false;
    }
  };

  return (
    <div className="py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مدیریت مقاله: {currentRun.topic}</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete}>
            حذف کارگاه
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            بازگشت
          </Button>
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentStage === stage.id
                    ? "bg-voxcina-blue text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
                onClick={() => setCurrentStage(stage.id)}
              >
                <span>{stage.icon}</span>
                <span className="hidden sm:inline">{stage.label}</span>
              </button>
              {index < STAGES.length - 1 && (
                <div className="w-8 sm:w-16 h-1 bg-gray-200 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stage Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {STAGES.find((s) => s.id === currentStage)?.icon}{" "}
            {STAGES.find((s) => s.id === currentStage)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStage === "brief" && (
            <BriefStage run={currentRun} onTriggerResearch={handleTriggerResearch} />
          )}
          {currentStage === "research" && (
            <ResearchStage
              run={currentRun}
              sources={researchSources}
              onApprove={handleApproveResearch}
              onTriggerResearch={handleTriggerResearch}
            />
          )}
          {currentStage === "content" && (
            <ContentStage run={currentRun} onApprove={handleApproveContent} onTriggerWriting={handleTriggerWriting} />
          )}
          {currentStage === "prompts" && (
            <PromptsStage run={currentRun} onApprove={handleApprovePrompts} onTriggerPrompts={handleTriggerPrompts} />
          )}
          {currentStage === "preview" && (
            <PreviewStage
              run={currentRun}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onArchive={handleArchive}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
