"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Briefcase,
  Check,
  Home,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { getCityCoordinate } from "@/lib/iranCityCoordinates";
import {
  addressTitleFallback,
  addressTypeFromTitle,
  type AddressType,
} from "@/lib/address";
import { useLocality } from "@/hooks/useLocality";
import type { Address, User } from "@/types/user";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-secondary-200 bg-voxcina-cream/30 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <Loader2 className="h-5 w-5 animate-spin text-voxcina-blue/50 dark:text-voxcina-cream/50" />
    </div>
  ),
});

export interface AddressFormValues extends Omit<Address, "id"> {
  addressType: AddressType;
}

type TextField = "title" | "firstName" | "lastName" | "phoneNumber" | "address" | "postalCode";

type RequiredField =
  | "firstName"
  | "lastName"
  | "phoneNumber"
  | "province"
  | "city"
  | "address"
  | "postalCode";

interface UnitValues {
  pelak: string;
  tabaghe: string;
  vahed: string;
}

interface AddressFormModalProps {
  isOpen: boolean;
  editingAddress: Address | null;
  hasAddresses: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (values: AddressFormValues, editingAddress: Address | null) => Promise<void>;
}

const EMPTY_UNIT: UnitValues = { pelak: "", tabaghe: "", vahed: "" };

const REQUIRED_FIELDS: ReadonlyArray<RequiredField> = [
  "firstName",
  "lastName",
  "phoneNumber",
  "province",
  "city",
  "address",
  "postalCode",
];

const ADDRESS_TYPE_OPTIONS: ReadonlyArray<{ value: AddressType; label: string; icon: ReactNode }> = [
  { value: "home", label: "خانه", icon: <Home className="h-4 w-4" /> },
  { value: "work", label: "محل کار", icon: <Briefcase className="h-4 w-4" /> },
  { value: "dorm", label: "خوابگاه", icon: <BedDouble className="h-4 w-4" /> },
];

function createEmptyValues(isDefault: boolean): AddressFormValues {
  return {
    title: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    province: "",
    provinceCode: 0,
    city: "",
    cityCode: 0,
    address: "",
    postalCode: "",
    isDefault,
    latitude: 0,
    longitude: 0,
    addressType: "home",
  };
}

function valuesFromAddress(address: Address): AddressFormValues {
  return {
    title: address.title || "",
    firstName: address.firstName || "",
    lastName: address.lastName || "",
    phoneNumber: address.phoneNumber || "",
    province: address.province || "",
    provinceCode: address.provinceCode || 0,
    city: address.city || "",
    cityCode: address.cityCode || 0,
    address: address.address || "",
    postalCode: address.postalCode || "",
    isDefault: address.isDefault || false,
    latitude: address.latitude || 0,
    longitude: address.longitude || 0,
    addressType: addressTypeFromTitle(address.title),
  };
}

function hasDraft(values: AddressFormValues, unit: UnitValues, step: number): boolean {
  return Boolean(
    values.title ||
      values.firstName ||
      values.lastName ||
      values.phoneNumber ||
      values.province ||
      values.city ||
      values.address ||
      values.postalCode ||
      unit.pelak ||
      unit.tabaghe ||
      unit.vahed ||
      values.latitude !== 0 ||
      values.longitude !== 0 ||
      step !== 1,
  );
}

export default function AddressFormModal({
  isOpen,
  editingAddress,
  hasAddresses,
  user,
  onClose,
  onSubmit,
}: AddressFormModalProps) {
  const { provinces, cities, fetchCities, loadingProvinces, loadingCities } = useLocality();

  const [values, setValues] = useState<AddressFormValues>(() => createEmptyValues(true));
  const [unit, setUnit] = useState<UnitValues>(EMPTY_UNIT);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  const [lastMode, setLastMode] = useState<"add" | "edit" | null>(null);

  // Opening the modal either populates the edit target, resets after an edit,
  // or keeps the unsaved draft of a previous add session. This is adjusted
  // during render (React's "adjust state when props change" pattern) rather
  // than in an effect: an effect runs after the first commit, which would let
  // an edit render the map step for a frame — fetching the map chunk and
  // flashing a map the user never asked for.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      if (editingAddress) {
        setValues(valuesFromAddress(editingAddress));
        setUnit(EMPTY_UNIT);
        setStep(2);
        setLastMode("edit");
      } else {
        if (lastMode === "edit" || !hasDraft(values, unit, step)) {
          setValues(createEmptyValues(!hasAddresses));
          setUnit(EMPTY_UNIT);
          setStep(1);
        }
        setLastMode("add");
      }
    }
  }

  useEffect(() => {
    if (!values.province || provinces.length === 0) return;
    const selected = provinces.find((province) => province.province_name === values.province);
    if (selected) void fetchCities(selected.province_code);
    // fetchCities is recreated on every render; keying on the province keeps
    // this to one request per selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.province, provinces]);

  const setField = <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    setField(event.target.name as TextField, event.target.value);
  };

  const handleProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const provinceName = event.target.value;
    const province = provinces.find((item) => item.province_name === provinceName);
    setValues((prev) => ({
      ...prev,
      province: provinceName,
      provinceCode: province?.province_code ?? 0,
      city: "",
      cityCode: 0,
    }));
  };

  const searchCityOnMap = async (provinceName: string, cityName: string) => {
    if (!cityName) return;

    const address = provinceName ? `${cityName}، ${provinceName}` : cityName;
    try {
      const response = await fetch(`/api/neshan/geocode?address=${encodeURIComponent(address)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          setValues((prev) => ({ ...prev, latitude: data.location.y, longitude: data.location.x }));
          return;
        }
      }
    } catch {
      // fall through to the local fallback
    }

    const coordinate = getCityCoordinate(cityName, provinceName);
    if (coordinate) {
      setValues((prev) => ({ ...prev, latitude: coordinate.lat, longitude: coordinate.lng }));
      return;
    }

    toast.error("موقعیت این شهر در نقشه یافت نشد. لطفاً روی نقشه کلیک کنید.");
  };

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const cityName = event.target.value;
    const city = cities.find((item) => item.city_name === cityName);
    setValues((prev) => ({
      ...prev,
      city: cityName,
      cityCode: city?.city_code ?? 0,
    }));
    void searchCityOnMap(values.province, cityName);
  };

  const handleProfileFill = () => {
    if (!user) return;
    const nameParts = (user.name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");
    setValues((prev) => ({
      ...prev,
      firstName,
      lastName,
      phoneNumber: user.phone || prev.phoneNumber,
    }));
    toast.success("اطلاعات شما از پروفایل وارد شد");
  };

  const resetForm = () => {
    setValues(createEmptyValues(false));
    setUnit(EMPTY_UNIT);
    setStep(1);
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const buildFullAddress = () => {
    let fullAddress = values.address;
    fullAddress += "، پلاک " + unit.pelak.trim();
    fullAddress += "، طبقه " + unit.tabaghe.trim();
    if (unit.vahed.trim()) {
      fullAddress += "، واحد " + unit.vahed.trim();
    }
    return fullAddress;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (REQUIRED_FIELDS.some((field) => !values[field])) {
      toast.error("لطفاً تمام فیلدهای ضروری را پر کنید");
      return;
    }
    if (!unit.pelak.trim()) {
      toast.error("لطفاً پلاک را وارد کنید");
      return;
    }
    if (!unit.tabaghe.trim()) {
      toast.error("لطفاً طبقه را وارد کنید");
      return;
    }
    if (values.latitude === 0 || values.longitude === 0) {
      toast.error("لطفاً موقعیت را از نقشه انتخاب کنید");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          ...values,
          address: buildFullAddress(),
          title: values.title || addressTitleFallback(values.addressType),
        },
        editingAddress,
      );
      toast.success(editingAddress ? "آدرس با موفقیت ویرایش شد" : "آدرس جدید با موفقیت اضافه شد");
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(
        editingAddress
          ? "خطا در ویرایش آدرس. لطفاً دوباره تلاش کنید"
          : "خطا در افزودن آدرس. لطفاً دوباره تلاش کنید",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle =
    step === 1 ? "انتخاب موقعیت روی نقشه" : editingAddress ? "ویرایش آدرس" : "افزودن آدرس جدید";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} contentClassName="max-w-4xl">
      <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="استان *"
                value={values.province}
                onChange={handleProvinceChange}
                placeholder={loadingProvinces ? "در حال بارگذاری..." : "انتخاب استان"}
                options={provinces.map((province) => ({
                  value: province.province_name,
                  label: province.province_name,
                }))}
                disabled={isSubmitting || loadingProvinces}
                required
              />
              <Select
                label="شهر *"
                value={values.city}
                onChange={handleCityChange}
                placeholder={loadingCities ? "در حال بارگذاری..." : "انتخاب شهر"}
                options={cities.map((city) => ({
                  value: city.city_name,
                  label: city.city_name,
                }))}
                disabled={isSubmitting || loadingCities}
                required
              />
            </div>

            <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-secondary-200 dark:border-voxcina-blue/30">
              <MapPicker
                location={{ lat: values.latitude, lng: values.longitude }}
                onChange={({ lat, lng }) =>
                  setValues((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                }
                onAddressResolved={(address) => setValues((prev) => ({ ...prev, address }))}
              />
            </div>

            {!values.address && (
              <p className="text-center text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40">
                لطفاً یک نقطه روی نقشه انتخاب کنید
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!values.address || values.latitude === 0}
                onClick={() => setStep(2)}
                rightIcon={<ArrowLeft className="h-4 w-4" />}
              >
                تایید و ادامه
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="address-details"
                  className="text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  آدرس *
                </label>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-voxcina-blue/60 transition-colors hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream"
                >
                  <ArrowRight className="h-3 w-3" />
                  تغییر موقعیت
                </button>
              </div>
              <textarea
                id="address-details"
                name="address"
                value={values.address}
                onChange={(event) => setField("address", event.target.value)}
                placeholder="آدرس از روی نقشه انتخاب می‌شود"
                required
                disabled={isSubmitting}
                rows={2}
                className="w-full resize-none select-text rounded-xl border-2 border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-voxcina-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="پلاک *"
                value={unit.pelak}
                onChange={(event) => setUnit((prev) => ({ ...prev, pelak: event.target.value }))}
                placeholder="مثال: ۱۲"
                disabled={isSubmitting}
                dir="ltr"
                className="text-right"
              />
              <Input
                label="طبقه *"
                value={unit.tabaghe}
                onChange={(event) => setUnit((prev) => ({ ...prev, tabaghe: event.target.value }))}
                placeholder="مثال: ۳"
                disabled={isSubmitting}
                dir="ltr"
                className="text-right"
              />
              <Input
                label="واحد"
                value={unit.vahed}
                onChange={(event) => setUnit((prev) => ({ ...prev, vahed: event.target.value }))}
                placeholder="اختیاری"
                disabled={isSubmitting}
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="border-t border-voxcina-cream dark:border-voxcina-blue/20" />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream">
                  اطلاعات گیرنده
                </span>
                {user && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleProfileFill}
                    disabled={isSubmitting}
                    leftIcon={<UserIcon className="h-3 w-3" />}
                    className="h-7 px-2 text-[10px]"
                  >
                    دریافت از پروفایل
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="نام *"
                  name="firstName"
                  value={values.firstName}
                  onChange={handleTextChange}
                  required
                  disabled={isSubmitting}
                />
                <Input
                  label="نام خانوادگی *"
                  name="lastName"
                  value={values.lastName}
                  onChange={handleTextChange}
                  required
                  disabled={isSubmitting}
                />
                <Input
                  label="شماره تماس *"
                  name="phoneNumber"
                  value={values.phoneNumber}
                  onChange={handleTextChange}
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  required
                  disabled={isSubmitting}
                  dir="ltr"
                  inputMode="tel"
                  className="text-right"
                />
              </div>
            </div>

            <div className="border-t border-voxcina-cream dark:border-voxcina-blue/20" />

            <div className="space-y-2">
              <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                نوع آدرس
              </span>
              <div className="flex flex-wrap gap-3">
                {ADDRESS_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-all duration-200 ${
                      values.addressType === option.value
                        ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream"
                        : "border-gray-200 text-gray-500 hover:border-voxcina-blue/30 dark:border-gray-700 dark:text-gray-400"
                    } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="addressType"
                      value={option.value}
                      checked={values.addressType === option.value}
                      onChange={() => setField("addressType", option.value)}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="عنوان آدرس (اختیاری)"
              name="title"
              value={values.title}
              onChange={handleTextChange}
              disabled={isSubmitting}
              placeholder={
                values.addressType === "home"
                  ? "مثال: خانه، منزل پدری"
                  : values.addressType === "dorm"
                    ? "مثال: خوابگاه، پانسیون"
                    : "مثال: دفتر، شرکت"
              }
            />

            <Input
              label="کد پستی *"
              name="postalCode"
              value={values.postalCode}
              onChange={handleTextChange}
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              required
              disabled={isSubmitting}
              dir="ltr"
              className="text-right"
            />

            <label className="flex items-center rounded-xl bg-gradient-to-l from-voxcina-cream/70 to-white p-3 dark:from-voxcina-blue/10 dark:to-transparent">
              <input
                type="checkbox"
                checked={values.isDefault}
                onChange={(event) => setField("isDefault", event.target.checked)}
                disabled={isSubmitting}
                className="ml-2 h-4 w-4 rounded border-gray-300 text-voxcina-blue focus:ring-voxcina-blue/30 disabled:opacity-50"
              />
              <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                تنظیم به عنوان آدرس پیش‌فرض
              </span>
            </label>

            <div className="flex items-center justify-between border-t border-voxcina-cream pt-4 dark:border-voxcina-blue/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                leftIcon={<ArrowRight className="h-4 w-4" />}
              >
                مرحله قبل
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Check className="h-4 w-4" />}
              >
                {editingAddress ? "ویرایش آدرس" : "ذخیره آدرس"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
