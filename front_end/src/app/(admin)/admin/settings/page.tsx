"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth-store";

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
      <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        در حال بارگذاری تنظیمات...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-voxcina-blue" />
          تنظیمات هوش مصنوعی
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          نام مدل‌های OpenRouter را اینجا تعیین کنید. تغییرات بدون نیاز به استقرار مجدد، از درخواست بعدی اعمال می‌شود.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-5 h-5" />
            مدل چت‌بات‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-voxcina-blue/10 rounded-lg p-3">
            <label className="block text-sm font-medium mb-1">مدل گفتگوی چت‌بات‌ها (OpenRouter)</label>
            <input
              className="input"
              dir="ltr"
              placeholder={settings?.defaults.supportChatModel || "openai/gpt-oss-20b:free"}
              value={chatModel}
              onChange={e => setChatModel(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              نام مدل را به صورت owner/model وارد کنید، مثلاً z-ai/glm-5.3. این مدل برای هر دو چت‌بات استفاده می‌شود:
              پشتیبانی مشتریان و گفتگوی اتاق پرو مجازی.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              اگر خالی بماند، پشتیبانی از {settings?.defaults.supportChatModel} و اتاق پرو از{" "}
              {settings?.defaults.tryOnChatModel} استفاده می‌کند.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-5 h-5" />
            مدل پرو مجازی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
            <label className="block text-sm font-medium mb-1">مدل تولید تصویر پرو مجازی (OpenRouter)</label>
            <input
              className="input"
              dir="ltr"
              placeholder={settings?.defaults.tryOnImageModel || "google/gemini-2.5-flash-image"}
              value={tryOnImageModel}
              onChange={e => setTryOnImageModel(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              نام مدل را به صورت owner/model وارد کنید. این مدل فقط برای ساخت تصویر پرو مجازی به کار می‌رود و در هیچ
              گفتگویی استفاده نمی‌شود؛ باید از تولید تصویر پشتیبانی کند.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              اگر خالی بماند، از {settings?.defaults.tryOnImageModel} استفاده می‌شود.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </Button>
        {settings?.updatedAt && (
          <span className="text-xs text-gray-500">
            آخرین تغییر: {new Date(settings.updatedAt).toLocaleString("fa-IR")}
          </span>
        )}
      </div>
    </div>
  );
}
