"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { GenerationBrief, BlogCategory } from "@/types/blog";
import { toast } from "react-hot-toast";

export default function NewBlogPage() {
  const router = useRouter();
  const { createRun } = useBlogAdminStore();

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [formData, setFormData] = useState<GenerationBrief>({
    topic: "",
    locale: "fa",
    targetAudience: "عاشقان مد و پوشاک",
    desiredLength: 1000,
    tone: "professional",
    keywords: [],
    category: "",
    sourcePreferences: [],
    additionalNotes: "",
    model: "qwen/qwen3.7-flash",
  });

  const [keywordsInput, setKeywordsInput] = useState("");

  const modelOptions = [
    { value: "deepseek/deepseek-v4-flash-0731", label: "DeepSeek V4 Flash" },
    { value: "qwen/qwen3.7-flash", label: "Qwen 3.7 Flash" },
    { value: "poolside/laguna-s-2.1:free", label: "Poolside Laguna S 2.1 (Free)" },
    { value: "google/gemini-3.6-flash", label: "Google Gemini 3.6 Flash" },
    { value: "meta/muse-spark-1.1", label: "Meta Muse Spark 1.1" },
    { value: "openai/gpt-5.6-luna", label: "OpenAI GPT-5.6 Luna" },
    { value: "x-ai/grok-4.5", label: "xAI Grok 4.5" },
    { value: "tencent/hy3", label: "Tencent HY3" },
    { value: "z-ai/glm-5.2", label: "Zhipu GLM 5.2" },
    { value: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nvidia Nemotron 3 Ultra" },
    { value: "minimax/minimax-m3", label: "MiniMax M3" },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/admin/blog-categories", {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCategories(data.filter((c: BlogCategory) => c.isActive));
        }
      } catch {
        // silently fail — dropdown will be empty
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic) {
      toast.error("موضوع الزامی است");
      return;
    }

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
              <select
                className="input w-full"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">انتخاب دسته...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  هنوز دسته‌ای تعریف نشده است. از{" "}
                  <a href="/admin/blogs/categories" className="text-voxcina-blue underline">
                    صفحه مدیریت دسته‌ها
                  </a>{" "}
                  استفاده کنید.
                </p>
              )}
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
                type="text"
                inputMode="numeric"
                min={500}
                max={5000}
                value={formData.desiredLength}
                onChange={(e) => {
                  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
                  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
                  const englishDigits = "0123456789";
                  const val = e.target.value
                    .split("")
                    .map((c) => {
                      const pi = persianDigits.indexOf(c);
                      if (pi !== -1) return englishDigits[pi];
                      const ai = arabicDigits.indexOf(c);
                      if (ai !== -1) return englishDigits[ai];
                      return c;
                    })
                    .join("");
                  setFormData({ ...formData, desiredLength: parseInt(val) || 0 });
                }}
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

            <div>
              <label className="block mb-1 font-medium">مدل هوش مصنوعی</label>
              <select
                className="input w-full"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              >
                {modelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
