"use client";

import React, { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  ChevronDown,
  Clock,
  Handshake,
  Inbox,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CareerSubmissionType, JobPosition } from "@/types/career";
import { HIRING_STEPS } from "@/lib/careers";
import { fetchOpenPositions } from "@/lib/careers-api";
import { toPersianNumber } from "@/lib/utils";
import CareerForm from "./_components/CareerForm";

const TABS: { id: CareerSubmissionType; label: string; icon: React.ReactNode }[] = [
  {
    id: "job",
    label: "فرصت‌های شغلی",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: "partnership",
    label: "همکاری تجاری",
    icon: <Handshake className="h-4 w-4" />,
  },
];

const BENEFITS = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "بازار بزرگ",
    body: "بیش از ۵۰۰ هزار کاربر فعال ماهانه؛ بازاری آماده برای محصولات، خدمات و ایده‌های شما.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "رشد مداوم",
    body: "کسب‌وکار ما هر سال بیش از ۳۰٪ رشد می‌کند و این فرصت رشد را با شرکا و همکارانش تقسیم می‌کند.",
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "برند معتبر",
    body: "همکاری با یکی از ۱۰ برند برتر حوزه پوشاک آنلاین، اعتبار کسب‌وکار و رزومه شما را بالا می‌برد.",
  },
];

interface CareersClientProps {
  /** Rendered on the server so the openings are in the HTML; kept in state
   *  afterwards because the list can go stale while the page is open. */
  initialPositions: JobPosition[];
}

export default function CareersClient({ initialPositions }: CareersClientProps) {
  const [positions, setPositions] = useState<JobPosition[]>(initialPositions);
  const [activeTab, setActiveTab] = useState<CareerSubmissionType>("job");
  const [presetPositionId, setPresetPositionId] = useState<string>();
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduceMotion = useReducedMotion();

  /** Entrance animation for below-the-fold blocks; disabled when the visitor
   *  asked the system for reduced motion. */
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.5 },
      };

  const goToForm = useCallback(
    (tab: CareerSubmissionType, positionId?: string) => {
      setActiveTab(tab);
      setPresetPositionId(positionId);
      formSectionRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [reduceMotion]
  );

  /**
   * Re-reads the openings after a rejected application. An admin can close a
   * posting while this page sits open; without this the visitor would keep
   * picking a role the server no longer accepts.
   */
  const refreshPositions = useCallback(async () => {
    const fresh = await fetchOpenPositions();
    if (fresh.length > 0) setPositions(fresh);
  }, []);

  /** Arrow keys move between tabs, as a tablist is expected to behave. */
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    // RTL: ArrowLeft advances, ArrowRight goes back.
    const delta = event.key === "ArrowLeft" ? 1 : -1;
    const next = (index + delta + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-b from-secondary-100 via-white to-secondary-100 dark:from-voxcina-darkBlue dark:via-voxcina-darkBlue/95 dark:to-voxcina-darkBlue">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-voxcina-blue/10 dark:border-secondary-200/10">
          {/* Static decoration: a soft brand glow instead of the endlessly
              spinning rings the page used to run on every frame. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-voxcina-blue/10 blur-3xl dark:bg-voxcina-blue/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-secondary-500/20 blur-3xl dark:bg-secondary-900/10"
          />

          <div className="container relative mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:py-24">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              {positions.length > 0 && (
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-voxcina-blue/15 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-voxcina-blue dark:border-secondary-200/15 dark:bg-voxcina-blue/10 dark:text-secondary-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  {toPersianNumber(positions.length)} موقعیت شغلی باز
                </span>
              )}

              <h1 className="mb-5 text-3xl font-bold leading-tight text-voxcina-darkBlue sm:text-4xl md:text-5xl lg:text-6xl dark:text-white">
                با ما رشد کنید،
                <br />
                <span className="text-voxcina-blue dark:text-secondary-200">
                  در وکسینا بسازید
                </span>
              </h1>

              <p className="mb-8 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-secondary-200/80">
                چه دنبال یک موقعیت شغلی باشید و چه به‌دنبال همکاری تجاری، مسیر
                شروع همکاری با وکسینا از همین صفحه می‌گذرد. فرم را پر کنید،
                رزومه‌تان را بفرستید و کد پیگیری بگیرید.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {positions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => goToForm("job")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-voxcina-blue to-voxcina-darkBlue px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:shadow-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 focus-visible:ring-offset-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    ارسال رزومه
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goToForm("partnership")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-voxcina-blue/20 bg-white/70 px-6 py-3 text-sm font-semibold text-voxcina-blue transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 focus-visible:ring-offset-2 dark:border-secondary-200/20 dark:bg-voxcina-blue/10 dark:text-secondary-200 dark:hover:bg-voxcina-blue/20"
                >
                  <Handshake className="h-4 w-4" />
                  درخواست همکاری تجاری
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Why us ───────────────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <motion.h2
            {...reveal}
            className="mb-10 text-center text-2xl font-bold text-voxcina-darkBlue sm:text-3xl dark:text-white"
          >
            چرا وکسینا؟
          </motion.h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {BENEFITS.map((benefit, index) => (
              <motion.article
                key={benefit.title}
                {...reveal}
                transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.08 }}
                className="rounded-2xl border border-voxcina-blue/10 bg-white/70 p-6 shadow-soft transition-shadow hover:shadow-medium dark:border-secondary-200/10 dark:bg-voxcina-blue/5"
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white shadow-soft">
                  {benefit.icon}
                </span>
                <h3 className="mb-2 text-lg font-bold text-voxcina-darkBlue dark:text-white">
                  {benefit.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
                  {benefit.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Open positions ───────────────────────────────────────────── */}
        <section
          id="open-positions"
          className="border-y border-voxcina-blue/10 bg-white/50 py-14 sm:py-20 dark:border-secondary-200/10 dark:bg-voxcina-blue/5"
        >
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...reveal} className="mb-8 text-center">
              <h2 className="mb-3 text-2xl font-bold text-voxcina-darkBlue sm:text-3xl dark:text-white">
                موقعیت‌های شغلی باز
              </h2>
              <p className="mx-auto max-w-xl text-sm text-gray-600 dark:text-secondary-200/80">
                {positions.length > 0
                  ? "روی هر موقعیت بزنید تا فرم با همان عنوان برای شما پر شود."
                  : "در حال حاضر موقعیت شغلی بازی نداریم."}
              </p>
            </motion.div>

            {positions.length === 0 ? (
              <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-voxcina-blue/20 bg-white/70 p-8 text-center dark:border-secondary-200/15 dark:bg-voxcina-darkBlue/30">
                <Inbox
                  className="mx-auto mb-3 h-9 w-9 text-voxcina-blue/40 dark:text-secondary-300/50"
                  aria-hidden="true"
                />
                <p className="mb-1 text-sm font-semibold text-voxcina-darkBlue dark:text-white">
                  فعلاً موقعیت شغلی بازی وجود ندارد
                </p>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-secondary-200/80">
                  به‌زودی موقعیت‌های تازه‌ای منتشر می‌شود. اگر پیشنهاد همکاری
                  تجاری دارید، از فرم پایین همین صفحه استفاده کنید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {positions.map((role, index) => {
                  const hasDetails =
                    !!role.description?.trim() ||
                    (role.requirements?.length ?? 0) > 0;
                  const isExpanded = expandedPositionId === role.id;

                  return (
                    <motion.article
                      key={role.id}
                      {...reveal}
                      transition={{
                        duration: 0.45,
                        delay: reduceMotion ? 0 : index * 0.06,
                      }}
                      className="group flex flex-col rounded-2xl border border-voxcina-blue/10 bg-white p-5 shadow-soft transition-all hover:border-voxcina-blue/30 hover:shadow-medium dark:border-secondary-200/10 dark:bg-voxcina-darkBlue/40"
                    >
                      <h3 className="mb-2 text-base font-bold text-voxcina-darkBlue sm:text-lg dark:text-white">
                        {role.title}
                      </h3>

                      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-voxcina-blue/70 dark:text-secondary-300">
                        <li className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {role.department}
                        </li>
                        <li className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {role.employment_type}
                        </li>
                        <li className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {role.location}
                        </li>
                      </ul>

                      <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
                        {role.summary}
                      </p>

                      {hasDetails && isExpanded && (
                        <div
                          id={`position-details-${role.id}`}
                          className="mb-4 space-y-3 rounded-xl bg-voxcina-blue/5 p-4 dark:bg-voxcina-blue/10"
                        >
                          {role.description?.trim() && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
                              {role.description}
                            </p>
                          )}
                          {(role.requirements?.length ?? 0) > 0 && (
                            <div>
                              <h4 className="mb-1.5 text-xs font-bold text-voxcina-darkBlue dark:text-white">
                                نیازمندی‌ها
                              </h4>
                              <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-gray-600 dark:text-secondary-200/80">
                                {role.requirements?.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => goToForm("job", role.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-voxcina-blue transition-colors hover:text-voxcina-darkBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 dark:text-secondary-200 dark:hover:text-white"
                        >
                          درخواست این موقعیت
                          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        </button>

                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPositionId(isExpanded ? null : role.id)
                            }
                            aria-expanded={isExpanded}
                            aria-controls={`position-details-${role.id}`}
                            className="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-voxcina-blue/70 transition-colors hover:text-voxcina-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 dark:text-secondary-300 dark:hover:text-secondary-100"
                          >
                            {isExpanded ? "بستن جزئیات" : "جزئیات بیشتر"}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Hiring process ───────────────────────────────────────────── */}
        <section className="container mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <motion.h2
            {...reveal}
            className="mb-10 text-center text-2xl font-bold text-voxcina-darkBlue sm:text-3xl dark:text-white"
          >
            مسیر همکاری در چهار قدم
          </motion.h2>

          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HIRING_STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                {...reveal}
                transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08 }}
                className="relative rounded-2xl border border-voxcina-blue/10 bg-white/70 p-5 dark:border-secondary-200/10 dark:bg-voxcina-blue/5"
              >
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-voxcina-blue/10 text-sm font-bold text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200">
                  {toPersianNumber(index + 1)}
                </span>
                <h3 className="mb-1.5 text-sm font-bold text-voxcina-darkBlue dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-secondary-200/80">
                  {step.description}
                </p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* ── Forms ────────────────────────────────────────────────────── */}
        <section
          ref={formSectionRef}
          id="apply"
          className="scroll-mt-20 border-t border-voxcina-blue/10 bg-white/50 py-14 sm:py-20 dark:border-secondary-200/10 dark:bg-voxcina-blue/5"
        >
          <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-2xl font-bold text-voxcina-darkBlue sm:text-3xl dark:text-white">
                {activeTab === "job" ? "ارسال رزومه" : "درخواست همکاری تجاری"}
              </h2>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
                {activeTab === "job"
                  ? "فرم زیر را پر کنید و رزومه PDF خود را بارگذاری کنید. پس از ثبت، کد پیگیری دریافت می‌کنید."
                  : "برای شروع همکاری، فرم زیر را تکمیل کنید. کارشناسان ما در اسرع وقت با شما تماس می‌گیرند."}
              </p>
            </div>

            {/* Segmented tabs. The previous version kept this state but never
                rendered a switcher, so the resume form was unreachable. */}
            <div
              role="tablist"
              aria-label="نوع درخواست"
              className="mx-auto mb-6 flex max-w-md rounded-xl border border-voxcina-blue/10 bg-white p-1 shadow-soft dark:border-secondary-200/10 dark:bg-voxcina-darkBlue/40"
            >
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  role="tab"
                  type="button"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPresetPositionId(undefined);
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 ${
                    activeTab === tab.id
                      ? "bg-voxcina-blue text-white shadow-soft"
                      : "text-voxcina-blue/70 hover:bg-voxcina-blue/5 dark:text-secondary-300 dark:hover:bg-voxcina-blue/10"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {TABS.map((tab) => (
              <div
                key={tab.id}
                role="tabpanel"
                id={`panel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
                hidden={activeTab !== tab.id}
              >
                {/* Keyed on the tab so switching starts a clean form rather than
                    carrying the other request's half-filled fields across. */}
                {activeTab === tab.id && (
                  <CareerForm
                    key={tab.id}
                    mode={tab.id}
                    positions={positions}
                    presetPositionId={
                      tab.id === "job" ? presetPositionId : undefined
                    }
                    onSubmitFailed={tab.id === "job" ? refreshPositions : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
