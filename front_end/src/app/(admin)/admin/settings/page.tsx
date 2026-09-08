"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth-store";
import {
  AdminPageHeader,
  AdminLoading,
  AdminField,
  AdminInput,
} from "@/components/admin/ui";

// Both fields are overrides: an empty field means the model the code already
// uses, which the API reports back as `defaults` so the placeholder can show
// the admin what "empty" actually resolves to.
interface AISettings {
  chatModel: string;
  tryOnImageModel: string;
  updatedAt?: string;
  defaults: {
    supportChatModel: string;
    tryOnChatModel: string;
    tryOnImageModel: string;
  };
}

export default function AdminSettingsPage() {
  const { adminToken } = useAuthStore();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [chatModel, setChatModel] = useState("");
  const [tryOnImageModel, setTryOnImageModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai/settings", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) throw new Error("failed");
      const data: AISettings = await response.json();
      setSettings(data);
      setChatModel(data.chatModel || "");
      setTryOnImageModel(data.tryOnImageModel || "");
    } catch {
      toast.error("خطا در دریافت تنظیمات هوش مصنوعی");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!adminToken) {
      toast.error("دسترسی ادمین ندارید");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          chatModel: chatModel.trim(),
          tryOnImageModel: tryOnImageModel.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "خطا در ذخیره تنظیمات");
      }
      setSettings(data);
      setChatModel(data.chatModel || "");
      setTryOnImageModel(data.tryOnImageModel || "");
      toast.success("تنظیمات ذخیره شد و از پیام بعدی اعمال می‌شود");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <AdminLoading message="در حال بارگذاری تنظیمات..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AdminPageHeader
        title="تنظیمات هوش مصنوعی"
        subtitle="نام مدل‌های OpenRouter را اینجا تعیین کنید. تغییرات بدون نیاز به استقرار مجدد، از درخواست بعدی اعمال می‌شود."
        icon={<Sparkles className="w-6 h-6" />}
      />

      <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
            <Bot className="w-5 h-5" />
            مدل چت‌بات‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-voxcina-cream/40 dark:bg-voxcina-blue/20 rounded-xl p-4">
            <AdminField
              label="مدل گفتگوی چت‌بات‌ها (OpenRouter)"
              hint={`نام مدل را به صورت owner/model وارد کنید، مثلاً z-ai/glm-5.3. این مدل برای هر دو چت‌بات استفاده می‌شود: پشتیبانی مشتریان و گفتگوی اتاق پرو مجازی.${
                settings
                  ? ` اگر خالی بماند، پشتیبانی از ${settings.defaults.supportChatModel} و اتاق پرو از ${settings.defaults.tryOnChatModel} استفاده می‌کند.`
                  : ""
              }`}
            >
              <AdminInput
                dir="ltr"
                placeholder={settings?.defaults.supportChatModel || "openai/gpt-oss-20b:free"}
                value={chatModel}
                onChange={e => setChatModel(e.target.value)}
              />
            </AdminField>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
            <Wand2 className="w-5 h-5" />
            مدل پرو مجازی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-voxcina-cream/40 dark:bg-voxcina-blue/20 rounded-xl p-4">
            <AdminField
              label="مدل تولید تصویر پرو مجازی (OpenRouter)"
              hint={`نام مدل را به صورت owner/model وارد کنید. این مدل فقط برای ساخت تصویر پرو مجازی به کار می‌رود و در هیچ گفتگویی استفاده نمی‌شود؛ باید از تولید تصویر پشتیبانی کند.${
                settings ? ` اگر خالی بماند، از ${settings.defaults.tryOnImageModel} استفاده می‌شود.` : ""
              }`}
            >
              <AdminInput
                dir="ltr"
                placeholder={settings?.defaults.tryOnImageModel || "google/gemini-2.5-flash-image"}
                value={tryOnImageModel}
                onChange={e => setTryOnImageModel(e.target.value)}
              />
            </AdminField>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} isLoading={saving} className="rounded-xl">
          ذخیره تنظیمات
        </Button>
        {settings?.updatedAt && (
          <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
            آخرین تغییر: {new Date(settings.updatedAt).toLocaleString("fa-IR")}
          </span>
        )}
      </div>
    </div>
  );
}
