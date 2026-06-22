"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  PackageOpen,
  X,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFaqStore } from "@/store/faq-store";
import type { Faq } from "@/types/faq";

export default function ClientFaqsPage() {
  const { faqs, isLoading, error, fetchFaqs, createFaq, updateFaq, deleteFaq } =
    useFaqStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
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

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

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

  const handleDeleteFaq = async (id?: string) => {
    if (!id) return;
    if (window.confirm("آیا از حذف این سوال متداول اطمینان دارید؟")) {
      await deleteFaq(id);
      fetchFaqs();
    }
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت سوالات متداول</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
          onClick={handleOpenAddModal}
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن سوال متداول
        </Button>
      </motion.div>

      <motion.div
        className="mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder="جستجو در سوالات متداول..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading && faqs.length === 0 ? (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <div className="animate-spin w-8 h-8 border-3 border-voxcina-blue/30 dark:border-voxcina-cream/30 border-t-voxcina-blue dark:border-t-voxcina-cream rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                در حال بارگذاری سوالات متداول...
              </h3>
            </CardContent>
          </Card>
        ) : currentFaqs.length === 0 ? (
          <Card className="border border-dashed border-voxcina-cream dark:border-voxcina-blue/40 rounded-2xl bg-voxcina-cream/10 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <PackageOpen className="w-12 h-12 mb-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                هیچ سوال متداولی پیدا نشد
              </h3>
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4 max-w-md">
                می‌توانید با کلیک روی دکمه "افزودن سوال متداول" اولین سوال را ثبت کنید.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
                onClick={handleOpenAddModal}
              >
                <Plus className="w-4 h-4 ml-1" />
                افزودن سوال متداول
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentFaqs.map((faq) => (
              <motion.div key={faq.id} variants={itemVariants}>
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
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          faq.is_active
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        <CheckCircle className="w-3 h-3 ml-1" />
                        {faq.is_active ? "فعال" : "غیرفعال"}
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
                        onClick={() => handleDeleteFaq(faq.id)}
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
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronRight className="w-4 h-4" />
            قبلی
          </Button>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
            <span>
              صفحه {currentPage} از {totalPages}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            بعدی
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-voxcina-blue/95 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 relative border border-voxcina-cream/60 dark:border-voxcina-blue/60">
            <button
              className="absolute top-3 left-3 p-1 rounded-full text-voxcina-blue/60 hover:text-voxcina-blue hover:bg-voxcina-cream/40 dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream dark:hover:bg-voxcina-blue/40"
              onClick={() => {
                setIsModalOpen(false);
                setEditingFaq(null);
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-voxcina-blue/10 dark:bg-voxcina-blue/30 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                  {editingFaq ? "ویرایش سوال متداول" : "افزودن سوال متداول"}
                </h2>
                <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  سوال و پاسخ را وارد کنید تا در صفحه سوالات متداول نمایش داده شود.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs mb-1 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                  سوال
                </label>
                <input
                  type="text"
                  value={formState.question ?? ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/60 bg-white/80 dark:bg-voxcina-blue/40 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue"
                  placeholder="مثال: سفارش من چقدر طول می‌کشد تا ارسال شود؟"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                  پاسخ
                </label>
                <textarea
                  value={formState.answer ?? ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, answer: e.target.value }))}
                  className="w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/60 bg-white/80 dark:bg-voxcina-blue/40 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue min-h-[120px] resize-y"
                  placeholder="پاسخ کامل و شفاف به سوال کاربر را وارد کنید..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                    دسته‌بندی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formState.category ?? ""}
                    onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/60 bg-white/80 dark:bg-voxcina-blue/40 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue"
                    placeholder="مثال: ارسال، پرداخت، سفارش‌ها"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                    ترتیب نمایش
                  </label>
                  <input
                    type="number"
                    value={formState.order ?? 0}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/60 bg-white/80 dark:bg-voxcina-blue/40 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue"
                    placeholder="مثال: 1، 2، 3 ..."
                  />
                </div>
              </div>

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

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl px-4 py-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingFaq(null);
                  }}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-xl px-4 py-2 text-sm bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
                  onClick={handleSaveFaq}
                  disabled={!formState.question || !formState.answer}
                >
                  {editingFaq ? "ذخیره تغییرات" : "افزودن سوال"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
