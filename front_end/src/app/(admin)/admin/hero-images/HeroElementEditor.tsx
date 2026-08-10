"use client";

import React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Heading as HeadingIcon,
  MousePointerClick,
  Pilcrow,
  Tag,
  Trash2,
} from "lucide-react";
import type {
  HeroElement,
  HeroElementAlign,
  HeroElementWidth,
  HeroFontWeight,
  HeroSpacing,
  HeroTextSize,
} from "@/types/hero-image";
import { HERO_ICON_NAMES } from "@/components/home/HeroContentLayer";
import {
  ColorField,
  FieldGrid,
  SegmentedField,
  SelectField,
  SliderField,
  TextField,
  ToggleField,
} from "./HeroFieldControls";

const TYPE_ICONS: Record<HeroElement["type"], React.ComponentType<{ className?: string }>> = {
  badge: Tag,
  heading: HeadingIcon,
  paragraph: Pilcrow,
  button: MousePointerClick,
};

const TYPE_LABELS: Record<HeroElement["type"], string> = {
  badge: "نشان",
  heading: "عنوان",
  paragraph: "پاراگراف",
  button: "دکمه",
};

const SIZE_OPTIONS: Array<{ value: HeroTextSize; label: string }> = [
  { value: "xs", label: "بسیار کوچک" },
  { value: "sm", label: "کوچک" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "بزرگ" },
  { value: "xl", label: "خیلی بزرگ" },
  { value: "2xl", label: "درشت" },
  { value: "3xl", label: "بسیار درشت (عنوان اصلی)" },
];

const WEIGHT_OPTIONS: Array<{ value: HeroFontWeight; label: string }> = [
  { value: "normal", label: "عادی" },
  { value: "medium", label: "متوسط" },
  { value: "semibold", label: "نیمه‌ضخیم" },
  { value: "bold", label: "ضخیم" },
  { value: "extrabold", label: "خیلی ضخیم" },
];

const ALIGN_OPTIONS: Array<{ value: HeroElementAlign; label: string }> = [
  { value: "inherit", label: "پیش‌فرض بخش" },
  { value: "start", label: "راست" },
  { value: "center", label: "وسط" },
  { value: "end", label: "چپ" },
];

const SPACING_OPTIONS: Array<{ value: HeroSpacing; label: string }> = [
  { value: "none", label: "بدون فاصله" },
  { value: "xs", label: "بسیار کم" },
  { value: "sm", label: "کم" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "زیاد" },
  { value: "xl", label: "بسیار زیاد" },
];

const WIDTH_OPTIONS: Array<{ value: HeroElementWidth; label: string }> = [
  { value: "auto", label: "خودکار" },
  { value: "sm", label: "باریک" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "عریض" },
  { value: "full", label: "تمام عرض" },
];

const ANIMATION_OPTIONS = [
  { value: "none" as const, label: "بدون انیمیشن" },
  { value: "slideUp" as const, label: "لغزش از پایین" },
  { value: "slideDown" as const, label: "لغزش از بالا" },
  { value: "fadeIn" as const, label: "محو شدن" },
  { value: "slideInRight" as const, label: "لغزش از راست" },
  { value: "slideInLeft" as const, label: "لغزش از چپ" },
];

const ICON_LABELS: Record<string, string> = {
  none: "بدون آیکون",
  arrowLeft: "پیکان به چپ",
  arrowRight: "پیکان به راست",
  star: "ستاره",
  sparkles: "درخشش",
  shoppingBag: "کیف خرید",
  flame: "شعله",
  heart: "قلب",
  tag: "برچسب",
};

interface HeroElementEditorProps {
  element: HeroElement;
  index: number;
  total: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<HeroElement>) => void;
  onColorChange: (patch: Partial<HeroElement["color"]>) => void;
  onBadgeChange: (patch: Partial<NonNullable<HeroElement["badge"]>>) => void;
  onButtonChange: (patch: Partial<NonNullable<HeroElement["button"]>>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export default function HeroElementEditor({
  element,
  index,
  total,
  expanded,
  onToggleExpand,
  onChange,
  onColorChange,
  onBadgeChange,
  onButtonChange,
  onMove,
  onRemove,
}: HeroElementEditorProps) {
  const Icon = TYPE_ICONS[element.type];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 text-start"
        >
          <Icon className="w-4 h-4 shrink-0 text-gray-500" />
          <span className="text-xs font-medium text-gray-500 shrink-0">
            {TYPE_LABELS[element.type]}
          </span>
          <span className="text-sm text-gray-800 truncate">
            {element.text || "(بدون متن)"}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onChange({ visible: !element.visible })}
            title={element.visible ? "پنهان کردن" : "نمایش دادن"}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
          >
            {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="جابه‌جایی به بالا"
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="جابه‌جایی به پایین"
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="حذف"
            className="p-1.5 rounded hover:bg-red-100 text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onToggleExpand} className="p-1.5 rounded hover:bg-gray-200 text-gray-500">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-100">
          <TextField
            label="متن"
            value={element.text}
            onChange={(text) => onChange({ text })}
            multiline={element.type === "paragraph"}
            dir="rtl"
          />

          <FieldGrid>
            <SelectField label="اندازه" value={element.size} options={SIZE_OPTIONS} onChange={(size) => onChange({ size })} />
            <SelectField label="ضخامت" value={element.weight} options={WEIGHT_OPTIONS} onChange={(weight) => onChange({ weight })} />
          </FieldGrid>

          <FieldGrid>
            <SelectField label="چیدمان" value={element.align} options={ALIGN_OPTIONS} onChange={(align) => onChange({ align })} />
            <SelectField label="فاصله پایین" value={element.spacing} options={SPACING_OPTIONS} onChange={(spacing) => onChange({ spacing })} />
          </FieldGrid>

          <FieldGrid>
            <SelectField label="حداکثر عرض" value={element.maxWidth} options={WIDTH_OPTIONS} onChange={(maxWidth) => onChange({ maxWidth })} />
            <SelectField label="انیمیشن ورود" value={element.animation} options={ANIMATION_OPTIONS} onChange={(animation) => onChange({ animation })} />
          </FieldGrid>

          {element.type === "heading" && (
            <SegmentedField
              label="سطح عنوان (سئو)"
              value={element.headingLevel || "h2"}
              onChange={(headingLevel) => onChange({ headingLevel })}
              options={[
                { value: "h1", label: "H1" },
                { value: "h2", label: "H2" },
                { value: "h3", label: "H3" },
                { value: "div", label: "بدون تگ" },
              ]}
              hint="فقط یک H1 در هر هیرو توصیه می‌شود."
            />
          )}

          {/* ---------------------------------------------------------- */}
          {/* Color */}
          {/* ---------------------------------------------------------- */}
          <div className="space-y-2 rounded-lg border border-gray-100 p-2.5">
            <SegmentedField
              label="نوع رنگ متن"
              value={element.color.mode}
              onChange={(mode) => onColorChange({ mode })}
              options={[
                { value: "solid", label: "تک‌رنگ" },
                { value: "gradient", label: "گرادیان" },
              ]}
            />
            {element.color.mode === "solid" ? (
              <ColorField label="رنگ متن" value={element.color.color} onChange={(color) => onColorChange({ color })} />
            ) : (
              <>
                <FieldGrid>
                  <ColorField label="رنگ شروع" value={element.color.from} onChange={(from) => onColorChange({ from })} />
                  <ColorField label="رنگ پایان" value={element.color.to} onChange={(to) => onColorChange({ to })} />
                </FieldGrid>
                <ColorField
                  label="رنگ میانی (اختیاری)"
                  value={element.color.via}
                  onChange={(via) => onColorChange({ via })}
                  allowEmpty
                />
              </>
            )}
            <SliderField
              label="شفافیت متن"
              value={element.color.opacity}
              min={10}
              max={100}
              suffix="%"
              onChange={(opacity) => onColorChange({ opacity })}
            />
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Badge-specific */}
          {/* ---------------------------------------------------------- */}
          {element.type === "badge" && element.badge && (
            <div className="space-y-2 rounded-lg border border-gray-100 p-2.5">
              <h5 className="text-xs font-semibold text-gray-500">تنظیمات نشان</h5>
              <ToggleField
                label="نمایش نقطه چشمک‌زن"
                checked={element.badge.showDot}
                onChange={(showDot) => onBadgeChange({ showDot })}
              />
              {element.badge.showDot && (
                <FieldGrid>
                  <ColorField label="رنگ نقطه" value={element.badge.dotColor} onChange={(dotColor) => onBadgeChange({ dotColor })} />
                  <ToggleField label="چشمک‌زن" checked={element.badge.pulseDot} onChange={(pulseDot) => onBadgeChange({ pulseDot })} />
                </FieldGrid>
              )}
              <FieldGrid>
                <ColorField label="رنگ پس‌زمینه" value={element.badge.background} onChange={(background) => onBadgeChange({ background })} />
                <SliderField
                  label="شفافیت پس‌زمینه"
                  value={element.badge.backgroundOpacity}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(backgroundOpacity) => onBadgeChange({ backgroundOpacity })}
                />
              </FieldGrid>
              <FieldGrid>
                <ColorField label="رنگ حاشیه" value={element.badge.borderColor} onChange={(borderColor) => onBadgeChange({ borderColor })} />
                <SliderField
                  label="شفافیت حاشیه"
                  value={element.badge.borderOpacity}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(borderOpacity) => onBadgeChange({ borderOpacity })}
                />
              </FieldGrid>
              <ToggleField label="افکت شیشه‌ای (بلور)" checked={element.badge.blur} onChange={(blur) => onBadgeChange({ blur })} />
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* Button-specific */}
          {/* ---------------------------------------------------------- */}
          {element.type === "button" && element.button && (
            <div className="space-y-2 rounded-lg border border-gray-100 p-2.5">
              <h5 className="text-xs font-semibold text-gray-500">تنظیمات دکمه</h5>
              <TextField
                label="لینک مقصد"
                value={element.button.href}
                onChange={(href) => onButtonChange({ href })}
                placeholder="/collection/example"
                dir="ltr"
                hint="مسیر داخلی (با /) یا آدرس کامل https"
              />
              <SegmentedField
                label="سبک دکمه"
                value={element.button.variant}
                onChange={(variant) => onButtonChange({ variant })}
                options={[
                  { value: "gradient", label: "گرادیان" },
                  { value: "solid", label: "تک‌رنگ" },
                  { value: "glass", label: "شیشه‌ای" },
                  { value: "outline", label: "خط‌دور" },
                ]}
              />
              <FieldGrid>
                <ColorField
                  label={element.button.variant === "gradient" ? "رنگ شروع" : "رنگ پس‌زمینه"}
                  value={element.button.from}
                  onChange={(from) => onButtonChange({ from })}
                />
                {element.button.variant === "gradient" ? (
                  <ColorField label="رنگ پایان" value={element.button.to} onChange={(to) => onButtonChange({ to })} />
                ) : (
                  <SliderField
                    label="شفافیت پس‌زمینه"
                    value={element.button.backgroundOpacity}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(backgroundOpacity) => onButtonChange({ backgroundOpacity })}
                  />
                )}
              </FieldGrid>
              <FieldGrid>
                <ColorField label="رنگ متن دکمه" value={element.button.textColor} onChange={(textColor) => onButtonChange({ textColor })} />
                <ColorField label="رنگ حاشیه" value={element.button.borderColor} onChange={(borderColor) => onButtonChange({ borderColor })} />
              </FieldGrid>
              <FieldGrid>
                <SelectField
                  label="گردی گوشه‌ها"
                  value={element.button.rounded}
                  onChange={(rounded) => onButtonChange({ rounded })}
                  options={[
                    { value: "md", label: "کم" },
                    { value: "lg", label: "متوسط" },
                    { value: "xl", label: "زیاد" },
                    { value: "full", label: "کامل (قرصی)" },
                  ]}
                />
                <SelectField
                  label="اندازه دکمه"
                  value={element.button.size}
                  onChange={(size) => onButtonChange({ size })}
                  options={[
                    { value: "sm", label: "کوچک" },
                    { value: "md", label: "متوسط" },
                    { value: "lg", label: "بزرگ" },
                  ]}
                />
              </FieldGrid>
              <FieldGrid>
                <SelectField
                  label="آیکون"
                  value={element.button.icon}
                  onChange={(icon) => onButtonChange({ icon })}
                  options={HERO_ICON_NAMES.map((icon) => ({ value: icon, label: ICON_LABELS[icon] || icon }))}
                />
                {element.button.icon !== "none" && (
                  <ColorField label="رنگ آیکون" value={element.button.iconColor} onChange={(iconColor) => onButtonChange({ iconColor })} />
                )}
              </FieldGrid>
              {element.button.icon !== "none" && (
                <SegmentedField
                  label="موقعیت آیکون"
                  value={element.button.iconPosition}
                  onChange={(iconPosition) => onButtonChange({ iconPosition })}
                  options={[
                    { value: "start", label: "ابتدای متن" },
                    { value: "end", label: "انتهای متن" },
                  ]}
                />
              )}
              <FieldGrid>
                <ToggleField label="افکت شیشه‌ای (بلور)" checked={element.button.blur} onChange={(blur) => onButtonChange({ blur })} />
                <ToggleField
                  label="تمام عرض در موبایل"
                  checked={element.button.fullWidthMobile}
                  onChange={(fullWidthMobile) => onButtonChange({ fullWidthMobile })}
                />
              </FieldGrid>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
