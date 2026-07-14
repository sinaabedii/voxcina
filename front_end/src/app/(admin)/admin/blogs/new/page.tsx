"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { GenerationBrief } from "@/types/blog";
import { toast } from "react-hot-toast";

export default function NewBlogPage() {
  const router = useRouter();
  const { createRun } = useBlogAdminStore();

  const [formData, setFormData] = useState<GenerationBrief>({
    topic: "",
    locale: "fa",
    targetAudience: "عاشقان مد و پوشاک",
    desiredLength: 1000,
    tone: "professional",
    keywords: [],
    category: "",
    sourcePreferences: {},
    additionalNotes: "",
  });

  const [keywordsInput, setKeywordsInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic) {
      toast.error("موضوع الزامی است");
      return;
    }

    // Parse keywords
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const brief: GenerationBrief = {
      ...formData,
      keywords,
    };

    const run = await createRun(brief);
    if (run) {
      toast.success("کارگاه با موفقیت ایجاد شد");
      router.push(`/admin/blogs/${run.id}`);
    } else {
      toast.error("خطا در ایجاد کارگاه");
    }
  };

  return (
    <div className="py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ایجاد مقاله جدید</h1>
        <Button variant="outline" onClick={() => router.back()}>
          بازگشت
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>خلاصه تولید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">موضوع *</label>
              <input
                className="input w-full"
                placeholder="موضوع مقاله را وارد کنید"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">دسته</label>
              <input
                className="input w-full"
                placeholder="دسته مقاله"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">مخاطب هدف</label>
              <input
                className="input w-full"
                placeholder="مخاطب هدف مقاله"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">لحن</label>
              <select
                className="input w-full"
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
              >
                <option value="professional">حرفهای</option>
                <option value="casual">دوستانه</option>
                <option value="academic">آکادمیک</option>
                <option value="persuasive">متقاعدکننده</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">طول مطلوب (کلمه)</label>
              <input
                className="input w-full"
                type="number"
                min={500}
                max={5000}
                value={formData.desiredLength}
                onChange={(e) => setFormData({ ...formData, desiredLength: parseInt(e.target.value) || 1000 })}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">کلمات کلیدی (با کاما جدا کنید)</label>
              <input
                className="input w-full"
                placeholder="کلمه1, کلمه2, کلمه3"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">یادداشتهای اضافی</label>
              <textarea
                className="input w-full h-24"
                placeholder="هرگونه دستورالعمل اضافی برای عامل..."
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                لغو
              </Button>
              <Button type="submit">ایجاد کارگاه</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
