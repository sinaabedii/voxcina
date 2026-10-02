"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  Plus,
  Trash2,
  ImageIcon,
  Loader2,
  Ruler,
  Info,
  Wand2,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
  Shirt,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import {
  AdminModal,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminFormGrid,
  AdminBadge,
} from "@/components/admin/ui";
import { SizingType, SizingMeasurementDef } from "@/types/sizing-type";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import { useAuthStore } from "@/store/auth-store";
import { toPersianNumber } from "@/lib/utils";

interface SizingTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSizingType?: SizingType | null;
  initialMode?: "ai" | "manual";
  onSuccess?: () => void;
}

const PRESET_SUGGESTIONS = [
  "هودی اورسایز پاییزه",
  "تیشرت بیسیک قواره آزاد",
  "کت تک مردانه کلاسیک",
  "شلوار مام‌استایل زنانه",
  "پیراهن مردانه رگولار فیت",
  "مانتو کتی جلوباز",
  "دامن میدی کلوش",
  "پالتو فوتر زمستانه",
];

const COMMON_MEASUREMENTS: { key: string; label: string; body_guide: string; fit_advice: string }[] = [
  {
    key: "total_length",
    label: "قد کل لباس",
    body_guide: "از بالاترین نقطه سرشانه (کنار یقه) به صورت عمودی تا لبه پایینی لباس اندازه گرفته می‌شود.",
    fit_advice: "برای فیت استاندارد، قد تا روی کمربند یا کمی پایین‌تر است.",
  },
  {
    key: "chest_width",
    label: "عرض سینه",
    body_guide: "محیط برجسته‌ترین بخش سینه را در حالت ایستاده و در خط افقی موازی زمین اندازه بگیرید.",
    fit_advice: "برای پارچه‌های بدون کش، حداقل ۵ الی ۸ سانتی‌متر آزادی دوخت اضافه در نظر بگیرید.",
  },
  {
    key: "shoulder_width",
    label: "عرض سرشانه",
    body_guide: "از محل اتصال استخوان انتهای سرشانه چپ تا سرشانه راست از پشت گردن اندازه بگیرید.",
    fit_advice: "در مدل‌های اورسایز و دراپ‌شولدر، خط سرشانه افتاده‌تر طراحی می‌شود.",
  },
  {
    key: "sleeve_length",
    label: "قد آستین",
    body_guide: "از انتهای استخوان سرشانه در امتداد دست کمی خمیده تا مچ دست اندازه گرفته می‌شود.",
    fit_advice: "قد آستین برای راحتی کاربری معمولاً تا روی استخوان مچ دست قرار می‌گیرد.",
  },
  {
    key: "waist_width",
    label: "عرض کمر",
    body_guide: "باریک‌ترین بخش تنه (حدود ۲ تا ۳ سانتی‌متر بالاتر از ناف) را اندازه بگیرید.",
    fit_advice: "برای شلوار و دامن به نوع فاق (بلند یا متوسط) توجه فرمایید.",
  },
  {
    key: "hip_width",
    label: "عرض باسن",
    body_guide: "برجسته‌ترین و پرحجم‌ترین قسمت باسن را در حالت ایستاده با پاهای جفت اندازه بگیرید.",
    fit_advice: "در لباس‌های اندامی یا راسته، آزادی حرکت حداقل ۳ سانتی‌متر نیاز است.",
  },
];

export default function SizingTypeModal({
  isOpen,
  onClose,
  editingSizingType,
  initialMode = "ai",
  onSuccess,
}: SizingTypeModalProps) {
  const { adminToken } = useAuthStore();
  const {
    createSizingType,
    updateSizingType,
    generateSizingResearch,
    generateDiagramPrompts,
    isGenerating,
  } = useSizingTypeStore();

  const isEditMode = Boolean(editingSizingType);

  // Tabs: 'ai' | 'editor'
  const [activeTab, setActiveTab] = useState<"ai" | "editor">(
    isEditMode || initialMode === "manual" ? "editor" : "ai"
  );

  // AI prompt state
  const [clothingTypeInput, setClothingTypeInput] = useState("");
  const [styleNotesInput, setStyleNotesInput] = useState("");
  const [aiModelInput, setAiModelInput] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [adminMeasurementGuide, setAdminMeasurementGuide] = useState<string | null>(null);
  const [generalFitGuide, setGeneralFitGuide] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imagePromptMannequin, setImagePromptMannequin] = useState("");
  const [activePromptTab, setActivePromptTab] = useState<"vector" | "mannequin">("vector");
  const [measurements, setMeasurements] = useState<SizingMeasurementDef[]>([]);
  const [promptMeasurements, setPromptMeasurements] = useState<SizingMeasurementDef[]>([]);
  const [isUpdatingPrompts, setIsUpdatingPrompts] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  // Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBlobRef = useRef<string | null>(null);

  const revokeActiveBlob = () => {
    if (previewBlobRef.current && previewBlobRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  };

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      revokeActiveBlob();
    };
  }, []);

  // UI state
  const [isCopiedVector, setIsCopiedVector] = useState(false);
  const [isCopiedMannequin, setIsCopiedMannequin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset or populate fields when modal opens or editing changes
  useEffect(() => {
    if (isOpen) {
      revokeActiveBlob();
      if (editingSizingType) {
        setName(editingSizingType.name || "");
        setSlug(editingSizingType.slug || "");
        setDescription(editingSizingType.description || "");
        setAdminMeasurementGuide(editingSizingType.admin_measurement_guide ?? null);
        setGeneralFitGuide(editingSizingType.general_fit_guide || "");
        setImagePrompt(editingSizingType.image_prompt || "");
        setImagePromptMannequin(editingSizingType.image_prompt_mannequin || "");
        setMeasurements(editingSizingType.measurements || []);
        setPromptMeasurements(editingSizingType.measurements || []);
        setIsActive(editingSizingType.is_active ?? true);
        setDisplayOrder(editingSizingType.display_order ?? 0);
        setExistingImagePath(editingSizingType.image_path || null);
        setPreviewUrl(editingSizingType.image_path || null);
        setImageFile(null);
        setActiveTab("editor");
      } else {
        setName("");
        setSlug("");
        setDescription("");
        setAdminMeasurementGuide(null);
        setGeneralFitGuide("");
        setImagePrompt("");
        setImagePromptMannequin("");
        setMeasurements([]);
        setPromptMeasurements([]);
        setIsActive(true);
        setDisplayOrder(0);
        setExistingImagePath(null);
        setPreviewUrl(null);
        setImageFile(null);
        setClothingTypeInput("");
        setStyleNotesInput("");
        setAiModelInput("");
        setActiveTab(initialMode === "manual" ? "editor" : "ai");
      }
    } else {
      revokeActiveBlob();
    }
  }, [isOpen, editingSizingType, initialMode]);

  // Handle AI generation
  const handleGenerateAI = async () => {
    if (!clothingTypeInput.trim()) {
      toast.error("لطفاً نام نوع لباس را وارد کنید");
      return;
    }

    try {
      const result = await generateSizingResearch(
        clothingTypeInput.trim(),
        styleNotesInput.trim(),
        aiModelInput.trim() || undefined,
        adminToken || undefined
      );

      if (result) {
        setName(result.name || clothingTypeInput.trim());
        setSlug(result.slug || "");
        setAdminMeasurementGuide(result.admin_measurement_guide ?? null);
        setGeneralFitGuide(result.general_fit_guide || "");
        setMeasurements(result.measurements || []);
        setPromptMeasurements(result.measurements || []);
        setImagePrompt(result.image_prompt_vector || result.nano_banana_prompt || "");
        setImagePromptMannequin(result.image_prompt_mannequin || "");
        setActiveTab("editor");
        toast.success("پژوهش اندازه‌ها و راهنمای خریدار با موفقیت آماده شد");
      }
    } catch {
      toast.error("خطا در ارتباط با دستیار هوشمند");
    }
  };

  // Detect when any measurement that was part of promptMeasurements has been removed
  const hasRemovedMeasurements = useMemo(() => {
    if (promptMeasurements.length === 0) return false;
    if (!imagePrompt && !imagePromptMannequin) return false;
    return promptMeasurements.some(
      (pm) => !measurements.some((m) => m.key === pm.key)
    );
  }, [promptMeasurements, measurements, imagePrompt, imagePromptMannequin]);

  // Regenerate diagram prompts for remaining measurements
  const handleUpdateDiagramPrompts = async () => {
    const clothingType = name.trim() || clothingTypeInput.trim();
    if (!clothingType) {
      toast.error("لطفاً نام نوع لباس را وارد کنید");
      return;
    }
    if (measurements.length === 0) {
      toast.warning("حداقل یک متغیر اندازه برای به‌روزرسانی پرامپت‌ها لازم است");
      return;
    }

    setIsUpdatingPrompts(true);
    try {
      const res = await generateDiagramPrompts(
        {
          clothingType,
          styleNotes: styleNotesInput.trim() || undefined,
          model: aiModelInput.trim() || undefined,
          measurements,
          currentVectorPrompt: imagePrompt,
          currentMannequinPrompt: imagePromptMannequin,
        },
        adminToken || undefined
      );

      if (res) {
        setImagePrompt(res.image_prompt_vector);
        setImagePromptMannequin(res.image_prompt_mannequin);
        setPromptMeasurements([...measurements]);
        toast.success(
          `پرامپت‌های تصویر برای ${toPersianNumber(measurements.length)} اندازه باقی‌مانده به‌روزرسانی شدند`
        );
      }
    } catch {
      toast.error("خطا در به‌روزرسانی پرامپت‌های دیاگرام");
    } finally {
      setIsUpdatingPrompts(false);
    }
  };

  // Measurement management
  const handleAddMeasurement = () => {
    setMeasurements((prev) => [
      ...prev,
      {
        key: `measurement_${prev.length + 1}`,
        label: "",
        body_guide: "",
        fit_advice: "",
        garment_measurement: "",
      },
    ]);
  };

  const handleAddCommonMeasurement = (item: (typeof COMMON_MEASUREMENTS)[0]) => {
    // Check if key already exists
    if (measurements.some((m) => m.key === item.key)) {
      toast.info(`اندازه «${item.label}» قبلاً اضافه شده است`);
      return;
    }
    setMeasurements((prev) => [...prev, { ...item }]);
  };

  const handleUpdateMeasurement = (
    index: number,
    field: keyof SizingMeasurementDef,
    value: string
  ) => {
    setMeasurements((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveMeasurement = (index: number) => {
    setMeasurements((prev) => prev.filter((_, i) => i !== index));
  };

  // Copy prompt handler
  const handleCopyPrompt = async (type: "vector" | "mannequin") => {
    const text = type === "vector" ? imagePrompt : imagePromptMannequin;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "vector") {
        setIsCopiedVector(true);
        setTimeout(() => setIsCopiedVector(false), 2500);
        toast.success("پرامپت طرح خطی وکتور کپی شد");
      } else {
        setIsCopiedMannequin(true);
        setTimeout(() => setIsCopiedMannequin(false), 2500);
        toast.success("پرامپت مانکن ۳ بعدی کپی شد");
      }
    } catch {
      toast.error("امکان کپی در کلیپ‌بورد وجود ندارد");
    }
  };

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("حجم فایل دیاگرام نباید بیشتر از ۱۰ مگابایت باشد");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("لطفاً یک فایل تصویری معتبر انتخاب کنید");
        return;
      }
      setImageFile(file);
      revokeActiveBlob();
      const url = URL.createObjectURL(file);
      previewBlobRef.current = url;
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    revokeActiveBlob();
    setImageFile(null);
    setPreviewUrl(null);
    setExistingImagePath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModalClose = () => {
    revokeActiveBlob();
    onClose();
  };

  // Form Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("نام نوع لباس الزامی است");
      setActiveTab("editor");
      return;
    }

    if (measurements.length === 0) {
      toast.warning("حداقل یک متغیر اندازه‌گیری برای این نوع لباس تعریف فرمایید");
    }

    // Check for duplicate measurement keys (case-insensitive)
    const keySet = new Set<string>();
    for (let i = 0; i < measurements.length; i++) {
      const lowerKey = measurements[i].key.trim().toLowerCase();
      if (lowerKey) {
        if (keySet.has(lowerKey)) {
          toast.error("کلیدهای انگلیسی متغیرهای اندازه نباید تکراری باشند");
          setActiveTab("editor");
          return;
        }
        keySet.add(lowerKey);
      }
    }

    // Validate that measurements have key and label
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      if (!m.label.trim()) {
        toast.error(`عنوان اندازه ردیف ${toPersianNumber(i + 1)} الزامی است`);
        setActiveTab("editor");
        return;
      }
      if (!m.key.trim()) {
        toast.error(`کلید انگلیسی اندازه ردیف ${toPersianNumber(i + 1)} الزامی است`);
        setActiveTab("editor");
        return;
      }
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    if (slug.trim()) formData.append("slug", slug.trim());
    formData.append("description", description.trim());
    if (adminMeasurementGuide !== null) {
      formData.append("admin_measurement_guide", adminMeasurementGuide.trim());
    }
    formData.append("general_fit_guide", generalFitGuide.trim());
    formData.append("image_prompt", imagePrompt.trim());
    formData.append("image_prompt_mannequin", imagePromptMannequin.trim());
    formData.append("is_active", String(isActive));
    formData.append("display_order", String(displayOrder));
    formData.append("measurements", JSON.stringify(measurements));

    if (imageFile) {
      formData.append("image", imageFile);
    } else if (existingImagePath) {
      formData.append("image_path", existingImagePath);
    } else {
      formData.append("image_path", "");
    }

    try {
      let res: SizingType | null = null;
      if (isEditMode && editingSizingType) {
        res = await updateSizingType(
          editingSizingType.id,
          formData,
          adminToken || ""
        );
      } else {
        res = await createSizingType(formData, adminToken || "");
      }

      if (res) {
        revokeActiveBlob();
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        isEditMode
          ? `ویرایش نوع سایزبندی: ${editingSizingType?.name || ""}`
          : "تعریف استاندارد و راهنمای سایزبندی"
      }
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1 py-1" dir="rtl">
        {/* Navigation Tabs (if not editing an existing item, or toggle freely) */}
        {!isEditMode && (
          <div className="flex items-center gap-2 p-1.5 bg-voxcina-cream/40 dark:bg-voxcina-blue/40 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "ai"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-voxcina-blue text-white shadow-md shadow-purple-500/20"
                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>تولید هوشمند با هوش مصنوعی</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/20 text-white mr-1">
                پیشنهادی
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "editor"
                  ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-sm"
                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>مشخصات و ابعاد دستی</span>
            </button>
          </div>
        )}

        {/* Tab 1: AI Generator Screen */}
        <AnimatePresence mode="wait">
          {activeTab === "ai" && (
            <motion.div
              key="ai-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Visual Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/10 via-indigo-900/5 to-voxcina-blue/10 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-voxcina-blue/40 border border-purple-200/50 dark:border-purple-800/30 p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                    <Wand2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                      دستیار پژوهش تخصصی الگوسازی و سایزبندی
                    </h3>
                    <p className="text-xs md:text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                      هوش مصنوعی ابتدا اندازه‌های خود لباس و جدول استاندارد آن را بررسی می‌کند و راهنمای اندازه‌گیری لباس را برای بازبینی شما می‌سازد؛ سپس با تکیه بر همان اندازه‌های ساختاریافته، راهنمای اندازه‌گیری بدن برای خریدار را تدوین می‌کند.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-purple-200/40 dark:border-purple-800/30">
                  <div className="flex items-start gap-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-purple-200/50 dark:border-purple-800/30 p-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">۱</span>
                    <div>
                      <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">پژوهش اندازه‌های لباس</p>
                      <p className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed mt-1">راهنمای داخلی اندازه‌گیری قطعات لباس برای کنترل شما</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-200/50 dark:border-indigo-800/30 p-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">۲</span>
                    <div>
                      <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">راهنمای خریدار</p>
                      <p className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed mt-1">دستور اندازه‌گیری بدن بر اساس اندازه‌های دقیق بالا</p>
                    </div>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="mt-5 pt-4 border-t border-purple-200/40 dark:border-purple-800/30">
                  <span className="block text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2.5">
                    الگوهای پیشنهادی پرکاربرد:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SUGGESTIONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setClothingTypeInput(preset)}
                        className="px-3 py-1 text-xs rounded-xl bg-white/80 dark:bg-voxcina-blue/60 border border-voxcina-cream dark:border-voxcina-blue/40 text-voxcina-blue dark:text-voxcina-cream hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shadow-2xs"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-4 bg-white/70 dark:bg-voxcina-blue/20 p-5 rounded-2xl border border-voxcina-cream/60 dark:border-voxcina-blue/30">
                <AdminField
                  label="نام نوع لباس یا پوشاک"
                  required
                  hint="مثال: هودی پاییزه اورسایز، کت تک مردانه، شلوار مام‌فیت زنانه، پیراهن اسلیم‌فیت"
                >
                  <AdminInput
                    placeholder="نام لباس مورد نظر..."
                    value={clothingTypeInput}
                    onChange={(e) => setClothingTypeInput(e.target.value)}
                    disabled={isGenerating}
                    autoFocus
                  />
                </AdminField>

                <AdminField
                  label="نکات تکمیلی استایل، جنس یا فیت (اختیاری)"
                  hint="مثال: قواره آزاد، بدون کشسانی، آستین رگلان، پارچه جین ۱۲ انسی، دراپ شولدر"
                >
                  <AdminTextarea
                    placeholder="نکات خاص الگو و دوخت که مایلید در استخراج ابعاد و پرامپت لحاظ شود..."
                    rows={2}
                    value={styleNotesInput}
                    onChange={(e) => setStyleNotesInput(e.target.value)}
                    disabled={isGenerating}
                  />
                </AdminField>

                <div className="rounded-xl p-3 border border-voxcina-cream dark:border-voxcina-blue/20 bg-voxcina-cream/20 dark:bg-voxcina-blue/10">
                  <AdminField
                    label="مدل هوش مصنوعی (OpenRouter)"
                    htmlFor="sizing-ai-model"
                    hint="اختیاری: نام مدل را به صورت owner/model وارد کنید، مثلاً openai/gpt-4o-mini یا google/gemini-2.5-flash. در صورت خالی بودن، مدل پیش‌فرض استفاده می‌شود."
                  >
                    <AdminInput
                      id="sizing-ai-model"
                      dir="ltr"
                      placeholder="openai/gpt-4o-mini"
                      value={aiModelInput}
                      onChange={(e) => setAiModelInput(e.target.value)}
                      disabled={isGenerating}
                    />
                  </AdminField>
                </div>

                {/* Loading state animation */}
                {isGenerating && (
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex items-center gap-3 text-purple-700 dark:text-purple-300">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <div className="text-xs md:text-sm font-medium">
                      مرحله اول: در حال پژوهش اندازه‌های لباس؛ سپس راهنمای خریدار از روی همان اندازه‌ها تدوین می‌شود...
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("editor")}
                    className="rounded-xl"
                  >
                    انتقال به ویرایش دستی بدون هوش مصنوعی
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={isGenerating || !clothingTypeInput.trim()}
                    onClick={handleGenerateAI}
                    className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-voxcina-blue text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        در حال تولید...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 ml-2 text-amber-300" />
                        پژوهش و تولید دو مرحله‌ای
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Editor Form (Manual / Populated by AI) */}
          {activeTab === "editor" && (
            <motion.form
              key="editor-tab"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Back to AI button if not editing an existing item */}
              {!isEditMode && (
                <div className="flex items-center justify-between bg-purple-50/70 dark:bg-purple-950/20 px-4 py-2.5 rounded-xl border border-purple-200/60 dark:border-purple-800/30 text-xs text-purple-700 dark:text-purple-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    می‌توانید اطلاعات فرم زیر را بازبینی، ویرایش یا تکمیل نمایید.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    تولید مجدد با هوش مصنوعی
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Basic Information */}
              <div className="bg-white/80 dark:bg-voxcina-blue/20 p-5 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                  <FileText className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream" />
                  <h4 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                    مشخصات پایه نوع پوشاک
                  </h4>
                </div>

                <AdminFormGrid>
                  <AdminField label="نام نوع پوشاک (فارسی)" required hint="مثال: هودی اورسایز پاییزه">
                    <AdminInput
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="نام نوع سایزبندی..."
                    />
                  </AdminField>

                  <AdminField
                    label="شناسه انگلیسی (Slug)"
                    hint="برای لینک‌ها و شناسایی سیستمی (مثال: oversized-hoodie)"
                  >
                    <AdminInput
                      dir="ltr"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="oversized-hoodie"
                    />
                  </AdminField>
                </AdminFormGrid>

                <AdminField label="توضیحات تکمیلی (اختیاری)">
                  <AdminInput
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توضیحات کوتاه جهت راهنمایی کارشناسان فروشگاه..."
                  />
                </AdminField>

                {adminMeasurementGuide !== null && (
                  <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">راهنمای اندازه‌گیری لباس (ویژه ادمین)</h4>
                        <p className="text-xs text-amber-800/70 dark:text-amber-200/70 leading-relaxed mt-1">این راهنما نتیجه پژوهش مرحله اول است و فقط برای بررسی اندازه‌های قطعات لباس در اختیار شماست؛ برای خریدار نمایش داده نمی‌شود.</p>
                      </div>
                    </div>
                    <AdminTextarea
                      rows={4}
                      value={adminMeasurementGuide}
                      onChange={(e) => setAdminMeasurementGuide(e.target.value)}
                      placeholder="نحوه قرار دادن لباس، نقاط اندازه‌گیری و ثبت ابعاد در جدول..."
                    />
                  </div>
                )}

                <AdminField
                  label="راهنمای اندازه‌گیری بدن (مخصوص خریداران)"
                  hint="این متن از روی اندازه‌های ساختاریافته بالا نوشته می‌شود و در تب راهنمای سایز به مشتری نمایش داده می‌شود؛ نکات فیت را کوتاه نگه دارید."
                >
                  <AdminTextarea
                    rows={4}
                    value={generalFitGuide}
                    onChange={(e) => setGeneralFitGuide(e.target.value)}
                    placeholder="برای اندازه‌گیری بخش‌های لازم بدن، متر را کجا و چگونه قرار دهد؛ در پایان فقط یک نکته کوتاه درباره فیت یا انتخاب سایز..."
                  />
                </AdminField>
              </div>

              {/* Measurements Section */}
              <div className="bg-white/80 dark:bg-voxcina-blue/20 p-5 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream" />
                    <h4 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                      ابعاد و متغیرهای جدول اندازه‌گیری
                    </h4>
                    <AdminBadge tone="info">
                      {toPersianNumber(measurements.length)} اندازه تعریف شده
                    </AdminBadge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMeasurement}
                    className="rounded-xl border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    افزودن اندازه جدید
                  </Button>
                </div>

                {/* Quick Common Measurements presets */}
                <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/40 p-3 rounded-xl">
                  <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-2 font-medium">
                    + افزودن سریع ابعاد استاندارد:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_MEASUREMENTS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => handleAddCommonMeasurement(m)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-voxcina-blue/60 border border-voxcina-cream/80 dark:border-voxcina-blue/40 text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/40 transition-colors"
                      >
                        + {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outdated Prompts Warning Banner */}
                {hasRemovedMeasurements && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-amber-300/70 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/20 dark:to-transparent">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          ناهماهنگی ابعاد با پرامپت‌های دیاگرام
                        </p>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed mt-0.5">
                          اندازه‌ای از این لباس حذف شده است، اما پرامپت‌های تولید تصویر دیاگرام هنوز حاوی خطوط ابعاد قبلی هستند.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleUpdateDiagramPrompts}
                      disabled={isUpdatingPrompts || measurements.length === 0}
                      className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ml-1.5 ${isUpdatingPrompts ? "animate-spin" : ""}`}
                      />
                      {isUpdatingPrompts
                        ? "در حال به‌روزرسانی..."
                        : `به‌روزرسانی پرامپت‌های تصویر برای ${toPersianNumber(measurements.length)} اندازه باقی‌مانده`}
                    </Button>
                  </div>
                )}

                {/* Measurements List */}
                {measurements.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-voxcina-cream dark:border-voxcina-blue/40 text-voxcina-blue/50 dark:text-voxcina-cream/50 text-sm">
                    هیچ متغیر اندازه‌ای هنوز تعریف نشده است. از دکمه‌های بالا برای افزودن استفاده کنید.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {measurements.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/60 dark:bg-voxcina-blue/30 shadow-2xs space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-voxcina-cream/70 dark:bg-voxcina-blue/60 text-voxcina-blue dark:text-voxcina-cream">
                            اندازه شماره {toPersianNumber(idx + 1)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeasurement(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="حذف این اندازه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <AdminField label="عنوان فارسی اندازه" required hint="مثال: قد کل، عرض سینه، قد آستین">
                            <AdminInput
                              value={m.label}
                              onChange={(e) =>
                                handleUpdateMeasurement(idx, "label", e.target.value)
                              }
                              placeholder="مثال: عرض سینه"
                            />
                          </AdminField>

                          <AdminField
                            label="کلید لاتین (ASCII Key)"
                            required
                            hint="شناسه ستون در دیتابیس (مثال: chest_width, total_length)"
                          >
                            <AdminInput
                              dir="ltr"
                              value={m.key}
                              onChange={(e) =>
                                handleUpdateMeasurement(idx, "key", e.target.value)
                              }
                              placeholder="chest_width"
                            />
                          </AdminField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <AdminField
                            label="راهنمای اندازه‌گیری بدن (Body Guide)"
                            hint="نحوه قرارگیری متر روی بدن برای خریدار"
                          >
                            <AdminInput
                              value={m.body_guide}
                              onChange={(e) =>
                                handleUpdateMeasurement(idx, "body_guide", e.target.value)
                              }
                              placeholder="محیط برجسته‌ترین بخش سینه به صورت افقی..."
                            />
                          </AdminField>

                          <AdminField
                            label="نکات آزادی و فیت (Fit Advice)"
                            hint="میزان آزادی دوخت یا کشسانی"
                          >
                            <AdminInput
                              value={m.fit_advice}
                              onChange={(e) =>
                                handleUpdateMeasurement(idx, "fit_advice", e.target.value)
                              }
                              placeholder="۵ الی ۸ سانتی‌متر آزادی در نظر گرفته شده..."
                            />
                          </AdminField>
                        </div>

                        <AdminField
                          label="نحوه اندازه‌گیری خود لباس (ویژه ادمین)"
                          hint="نقطه و روش اندازه‌گیری همین بخش روی لباس تخت یا در جدول سایز"
                        >
                          <AdminInput
                            value={m.garment_measurement || ""}
                            onChange={(e) =>
                              handleUpdateMeasurement(idx, "garment_measurement", e.target.value)
                            }
                            placeholder="لباس را تخت کنید و عرض سینه را از زیر حلقه تا زیر حلقه بگیرید..."
                          />
                        </AdminField>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dual-Prompt Generator Card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-voxcina-blue text-white p-5 md:p-6 rounded-2xl shadow-xl border border-indigo-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-white">
                        پرامپت‌های تولید تصویر راهنمای اندازه
                      </h4>
                      <p className="text-[11px] text-slate-300/80 mt-0.5">
                        مهندسی شده برای ابزارهای تولید تصویر هوش مصنوعی (Nano Banana Pro / Midjourney)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Outdated Alert in Prompt Card */}
                {hasRemovedMeasurements && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-medium">
                        ابعاد تغییر یافته است — بروزرسانی پرامپت‌های وکتور و مانکن با دکمه به‌روزرسانی
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleUpdateDiagramPrompts}
                      disabled={isUpdatingPrompts || measurements.length === 0}
                      className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ml-1.5 ${isUpdatingPrompts ? "animate-spin" : ""}`}
                      />
                      {isUpdatingPrompts
                        ? "در حال به‌روزرسانی..."
                        : `به‌روزرسانی پرامپت‌های تصویر برای ${toPersianNumber(measurements.length)} اندازه باقی‌مانده`}
                    </Button>
                  </div>
                )}

                {/* Tab Switcher */}
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActivePromptTab("vector")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      activePromptTab === "vector"
                        ? "bg-gradient-to-r from-indigo-600 to-voxcina-blue text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>طرح خطی وکتور (Vector Flat Sketch)</span>
                    {imagePrompt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePromptTab("mannequin")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      activePromptTab === "mannequin"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Shirt className="w-4 h-4" />
                    <span>مانکن نامرئی ۳ بعدی (3D Ghost Mannequin)</span>
                    {imagePromptMannequin && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                    )}
                  </button>
                </div>

                {/* Active Tab Content */}
                {activePromptTab === "vector" ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-white/5 p-3.5 rounded-xl border border-white/10">
                      <div className="space-y-1">
                        <span className="font-semibold text-amber-300">سبک وکتور و فلت اسکچ:</span>
                        <p className="leading-relaxed text-slate-300 text-[11px] md:text-xs">
                          طرح خطی و تکنیکال وکتور لباس با خطوط ابعاد تراموتا روی پس‌زمینه کرم ملایم (#FAF7F2).
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPrompt("vector")}
                        disabled={!imagePrompt}
                        className="shrink-0 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      >
                        {isCopiedVector ? (
                          <>
                            <Check className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
                            کپی شد!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 ml-1.5" />
                            کپی پرامپت وکتور
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={4}
                        dir="ltr"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Fashion technical flat sketch diagram prompt for Nano Banana Pro..."
                        className="w-full font-mono text-xs p-3.5 rounded-xl bg-black/40 border border-white/10 text-emerald-300 focus:outline-none focus:border-indigo-400 placeholder-white/30 resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-white/5 p-3.5 rounded-xl border border-white/10">
                      <div className="space-y-1">
                        <span className="font-semibold text-purple-300">سبک مانکن نامرئی استودیویی:</span>
                        <p className="leading-relaxed text-slate-300 text-[11px] md:text-xs">
                          عکاسی استودیویی لباس واقعی روی مانکن نامرئی با فرم و ایستایی سه‌بعدی روی پس‌زمینه سفید خالص (#FFFFFF) منطبق با تم و رنگ‌های لوکس وکسینا.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPrompt("mannequin")}
                        disabled={!imagePromptMannequin}
                        className="shrink-0 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      >
                        {isCopiedMannequin ? (
                          <>
                            <Check className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
                            کپی شد!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 ml-1.5" />
                            کپی پرامپت مانکن ۳ بعدی
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={4}
                        dir="ltr"
                        value={imagePromptMannequin}
                        onChange={(e) => setImagePromptMannequin(e.target.value)}
                        placeholder="3D Ghost mannequin studio photo prompt for Nano Banana Pro..."
                        className="w-full font-mono text-xs p-3.5 rounded-xl bg-black/40 border border-white/10 text-purple-300 focus:outline-none focus:border-purple-400 placeholder-white/30 resize-y"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Diagram Image Upload */}
              <div className="bg-white/80 dark:bg-voxcina-blue/20 p-5 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                  <ImageIcon className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream" />
                  <h4 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                    تصویر دیاگرام راهنمای ابعاد (Technical Flat Sketch)
                  </h4>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-voxcina-cream dark:border-voxcina-blue/40 bg-voxcina-cream/20 dark:bg-voxcina-blue/30">
                    <div className="relative w-36 h-36 rounded-xl overflow-hidden bg-white dark:bg-voxcina-blue/50 border border-voxcina-cream dark:border-voxcina-blue/40 shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="پیش‌نمایش دیاگرام"
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    <div className="space-y-2 flex-grow text-center sm:text-right">
                      <div className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                        {imageFile ? `فایل انتخابی: ${imageFile.name}` : "تصویر ذخیره‌شده فعلی"}
                      </div>
                      <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        این دیاگرام خطوط اندازه‌گیری را به شکل شماتیک در مدال و تب راهنمای سایز به مشتری نشان می‌دهد.
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl"
                        >
                          <RefreshCw className="w-3.5 h-3.5 ml-1" />
                          تغییر تصویر
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveImage}
                          className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 text-center rounded-2xl border-2 border-dashed border-voxcina-cream hover:border-voxcina-blue/40 dark:border-voxcina-blue/40 dark:hover:border-voxcina-cream/50 bg-voxcina-cream/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/30 cursor-pointer transition-all space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/40 flex items-center justify-center mx-auto text-voxcina-blue dark:text-voxcina-cream">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                      برای بارگذاری دیاگرام کلیک کنید یا فایل را بکشید و رها کنید
                    </div>
                    <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      فرمت‌های مجاز: PNG ،JPG یا WebP (ترجیحاً دیاگرام با پس‌زمینه شفاف یا سفید تمیز)
                    </p>
                  </div>
                )}
              </div>

              {/* Status and Order Settings */}
              <div className="bg-white/80 dark:bg-voxcina-blue/20 p-5 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30">
                <AdminFormGrid>
                  <AdminField label="ترتیب نمایش" hint="اولویت در لیست‌ها و فرم انتخاب (عدد کمتر = اولویت بالاتر)">
                    <AdminInput
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    />
                  </AdminField>

                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                      وضعیت انتشار
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-5 h-5 rounded text-voxcina-blue focus:ring-voxcina-blue/30 border-voxcina-cream"
                      />
                      <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                        {isActive ? "فعال و قابل انتخاب در فرم محصولات" : "پیش‌نویس / غیرفعال"}
                      </span>
                    </label>
                  </div>
                </AdminFormGrid>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-voxcina-cream dark:border-voxcina-blue/30">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving}
                  className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white min-w-[140px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : isEditMode ? (
                    "به‌روزرسانی نوع سایزبندی"
                  ) : (
                    "ذخیره و ایجاد نوع سایزبندی"
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </AdminModal>
  );
}
