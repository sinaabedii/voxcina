"use client";

import { useEffect, useState } from "react";
import {
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  PackageOpen,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFaqStore } from "@/store/faq-store";
import type { Faq } from "@/types/faq";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminFormGrid,
} from "@/components/admin/ui";

export default function ClientFaqsPage() {
  const { faqs, isLoading, error, fetchFaqs, createFaq, updateFaq, deleteFaq } =
    useFaqStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null);
  const [formState, setFormState] = useState<Partial<Faq>>({
    question: "",
    answer: "",
    category: "",
    is_active: true,
    order: 0,
  });

  useEffect(() => {
    if (!faqs || faqs.length === 0) {
      fetchFaqs();
    }
  }, [fetchFaqs, faqs]);

  const filteredFaqs = faqs.filter((faq) => {
    const q = faq.question?.toLowerCase() ?? "";
    const c = faq.category?.toLowerCase() ?? "";
    const term = searchTerm.toLowerCase();
    return q.includes(term) || c.includes(term);
  });

  const faqsPerPage = 8;
  const totalPages = Math.ceil(filteredFaqs.length / faqsPerPage) || 1;
  const indexOfLastFaq = currentPage * faqsPerPage;
  const indexOfFirstFaq = indexOfLastFaq - faqsPerPage;
  const currentFaqs = filteredFaqs.slice(indexOfFirstFaq, indexOfLastFaq);

  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setFormState({ question: "", answer: "", category: "", is_active: true, order: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: Faq) => {
    setEditingFaq(faq);
    setFormState({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      is_active: faq.is_active ?? true,
      order: faq.order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveFaq = async () => {
    if (!formState.question || !formState.answer) {
      return;
    }

    if (editingFaq && editingFaq.id) {
      await updateFaq(editingFaq.id, {
        question: formState.question,
        answer: formState.answer,
        category: formState.category ?? "",
        is_active: formState.is_active ?? true,
        order: formState.order ?? 0,
      });
    } else {
      await createFaq({
        question: formState.question!,
        answer: formState.answer!,
        category: formState.category ?? "",
        is_active: formState.is_active ?? true,
        order: formState.order ?? 0,
      });
    }

    setIsModalOpen(false);
    setEditingFaq(null);
    fetchFaqs();
  };

  const handleConfirmDeleteFaq = async () => {
    if (!faqToDelete?.id) return;
    await deleteFaq(faqToDelete.id);
    setFaqToDelete(null);
    fetchFaqs();
  };

  const handleToggleActive = async (faq: Faq) => {
    if (!faq.id) return;
    await updateFaq(faq.id, {
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? "",
      is_active: !faq.is_active,
      order: faq.order ?? 0,
    });
    fetchFaqs();
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader
        title="مدیریت سوالات متداول"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            onClick={handleOpenAddModal}
          >
            <Plus className="w-4 h-4 ml-1" />
            افزودن سوال متداول
          </Button>
        }
      />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجو در سوالات متداول..."
      />

      {error && <AdminError message={error} />}

      <div>
        {isLoading && faqs.length === 0 ? (
          <AdminLoading message="در حال بارگذاری سوالات متداول..." />
        ) : currentFaqs.length === 0 ? (
          <AdminEmpty
            icon={PackageOpen}
            title="هیچ سوال متداولی پیدا نشد"
            description="می‌توانید با کلیک روی دکمه «افزودن سوال متداول» اولین سوال را ثبت کنید."
            action={
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
                onClick={handleOpenAddModal}
              >
                <Plus className="w-4 h-4 ml-1" />
                افزودن سوال متداول
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentFaqs.map((faq) => (
              <div key={faq.id}>
                <Card className="border border-voxcina-cream/80 dark:border-voxcina-blue/40 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-voxcina-blue/10 dark:bg-voxcina-blue/30 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream mt-1">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-1">
                          {faq.question}
                        </CardTitle>
                        {faq.category && (
                          <p className="text-xs sm:text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            دسته‌بندی: {faq.category}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(faq)}
                        className="rounded-full transition-transform hover:scale-105"
                        title={faq.is_active ? "غیرفعال کردن" : "فعال کردن"}
                        aria-label={faq.is_active ? "غیرفعال کردن" : "فعال کردن"}
                      >
                        <AdminBadge tone={faq.is_active ? "success" : "neutral"}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          {faq.is_active ? "فعال" : "غیرفعال"}
                        </AdminBadge>
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-full text-voxcina-blue/80 hover:text-voxcina-blue hover:bg-voxcina-cream/40 dark:text-voxcina-cream/80 dark:hover:text-voxcina-cream dark:hover:bg-voxcina-blue/40"
                        onClick={() => handleOpenEditModal(faq)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-full text-red-500/80 hover:text-red-500 hover:bg-red-50 dark:text-red-300/80 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() => setFaqToDelete(faq)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <p className="text-xs sm:text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 leading-relaxed">
                      {faq.answer}
                    </p>
                    {typeof faq.order === "number" && (
                      <p className="mt-2 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        ترتیب نمایش: {faq.order}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminPagination
        page={currentPage}
        totalPages={totalPages}
        onChange={setCurrentPage}
      />

      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFaq(null);
        }}
        title={editingFaq ? "ویرایش سوال متداول" : "افزودن سوال متداول"}
        size="md"
      >
        <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
          سوال و پاسخ را وارد کنید تا در صفحه سوالات متداول نمایش داده شود.
        </p>

        <div className="space-y-4 mt-2">
          <AdminField label="سوال" required>
            <AdminInput
              type="text"
              value={formState.question ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, question: e.target.value }))}
              placeholder="مثال: سفارش من چقدر طول می‌کشد تا ارسال شود؟"
            />
          </AdminField>

          <AdminField label="پاسخ" required>
            <AdminTextarea
              value={formState.answer ?? ""}
              onChange={(e) => setFormState((prev) => ({ ...prev, answer: e.target.value }))}
              className="min-h-[120px] resize-y"
              placeholder="پاسخ کامل و شفاف به سوال کاربر را وارد کنید..."
            />
          </AdminField>

          <AdminFormGrid className="sm:grid-cols-2">
            <AdminField label="دسته‌بندی (اختیاری)">
              <AdminInput
                type="text"
                value={formState.category ?? ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="مثال: ارسال، پرداخت، سفارش‌ها"
              />
            </AdminField>

            <AdminField label="ترتیب نمایش">
              <AdminInput
                type="number"
                value={formState.order ?? 0}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))
                }
                placeholder="مثال: 1، 2، 3 ..."
              />
            </AdminField>
          </AdminFormGrid>

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80">
              <input
                type="checkbox"
                checked={formState.is_active ?? true}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="rounded border-voxcina-cream/70 dark:border-voxcina-blue/60 text-voxcina-blue focus:ring-voxcina-blue"
              />
              فعال (نمایش در صفحه سوالات متداول)
            </label>
          </div>
        </div>
        <AdminModalActions
          onCancel={() => {
            setIsModalOpen(false);
            setEditingFaq(null);
          }}
        >
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl px-4 py-2 text-sm bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
            onClick={handleSaveFaq}
            disabled={!formState.question || !formState.answer}
          >
            {editingFaq ? "ذخیره تغییرات" : "افزودن سوال"}
          </Button>
        </AdminModalActions>
      </AdminModal>

      {/* Delete FAQ Confirmation Modal */}
      <AdminModal
        isOpen={!!faqToDelete}
        onClose={() => setFaqToDelete(null)}
        title="تایید حذف سوال متداول"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
          آیا از حذف این سوال متداول مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setFaqToDelete(null)}>
          <Button
            variant="danger"
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleConfirmDeleteFaq}
          >
            بله، حذف کن
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
