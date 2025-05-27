import React, { useState, useEffect } from "react";
import { MapPin, Plus, Home, Briefcase, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Address } from "@/store/dashboard-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocality } from "@/hooks/useLocality";
import { motion, AnimatePresence } from "framer-motion";

interface CheckoutFormProps {
  onSelectAddress: (address: Address) => void;
  selectedAddressId?: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  onSelectAddress,
  selectedAddressId,
}) => {
  const { addresses, addAddress, updateAddress } = useDashboardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    province: "",
    city: "",
    address: "",
    postalCode: "",
    isDefault: false,
  });

  const { provinces, cities, fetchCities, loadingProvinces, loadingCities } = useLocality();

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        onSelectAddress(defaultAddress);
      } else {
        onSelectAddress(addresses[0]);
      }
    }
  }, [addresses, onSelectAddress, selectedAddressId]);

  useEffect(() => {
    if (formData.province && provinces.length) {
      const selected = provinces.find((p) => p.province_name === formData.province);
      if (selected) {
        fetchCities(selected.province_code);
      }
    }
  }, [formData.province, provinces]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddNew = () => {
    setFormData({
      title: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      province: "",
      city: "",
      address: "",
      postalCode: "",
      isDefault: addresses.length === 0,
    });
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      title: address.title,
      firstName: address.firstName,
      lastName: address.lastName,
      phoneNumber: address.phoneNumber,
      province: address.province,
      city: address.city,
      address: address.address,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setEditingAddress(address.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAddress) {
      updateAddress(editingAddress, formData);
    } else {
      const newAddress = addAddress(formData);
      onSelectAddress(addresses[addresses.length - 1]);
    }

    setIsModalOpen(false);
  };

  // تعیین نوع آیکون براساس عنوان آدرس
  const getAddressIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("خانه") || lowerTitle.includes("منزل")) {
      return <Home className="w-4 h-4 ml-1 text-primary" />;
    } else if (lowerTitle.includes("کار") || lowerTitle.includes("دفتر") || lowerTitle.includes("شرکت")) {
      return <Briefcase className="w-4 h-4 ml-1 text-primary" />;
    }
    return <MapPin className="w-4 h-4 ml-1 text-primary" />;
  };

  return (
    <div className="animate-fadeIn">
      <Card className="voxcina-card">
        <CardHeader>
          <CardTitle className="text-primary flex items-center">
            <MapPin className="ml-2 h-5 w-5" />
            آدرس تحویل سفارش
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8 bg-secondary/20 rounded-xl">
              <MapPin className="h-12 w-12 mx-auto text-primary/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                هنوز آدرسی ثبت نکرده‌اید
              </p>
              <Button variant="primary" onClick={handleAddNew} className="shadow-soft hover:shadow-medium">
                <Plus className="w-4 h-4 ml-2" />
                افزودن آدرس جدید
              </Button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <AnimatePresence>
                  {addresses.map((address) => (
                    <motion.div
                      key={address.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 group ${
                        selectedAddressId === address.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border/10 hover:border-primary/30 hover:shadow-soft"
                      }`}
                      onClick={() => onSelectAddress(address)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id={`address-${address.id}`}
                            checked={selectedAddressId === address.id}
                            onChange={() => onSelectAddress(address)}
                            className="ml-2 text-primary focus:ring-primary/30"
                          />
                          <label
                            htmlFor={`address-${address.id}`}
                            className="flex items-center font-medium group-hover:text-primary transition-colors duration-200"
                          >
                            {getAddressIcon(address.title)}
                            {address.title}
                          </label>
                          {address.isDefault && (
                            <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center">
                              <Check className="w-3 h-3 ml-1" />
                              پیش‌فرض
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(address);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
                        >
                          ویرایش
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mr-6 space-y-1">
                        <p className="font-medium text-foreground">
                          {address.firstName} {address.lastName}
                        </p>
                        <p>
                          {address.province}، {address.city}، {address.address}
                        </p>
                        <p>کد پستی: {address.postalCode}</p>
                        <p className="text-primary">شماره تماس: {address.phoneNumber}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <Button 
                variant="outline" 
                onClick={handleAddNew}
                className="hover:bg-secondary transition-colors duration-200"
              >
                <Plus className="w-4 h-4 ml-2" />
                افزودن آدرس جدید
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? "ویرایش آدرس" : "افزودن آدرس جدید"}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="عنوان آدرس"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="مثال: خانه، محل کار"
              leftElement={<Home className="h-4 w-4" />}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="نام"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <Input
                label="نام خانوادگی"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="شماره تماس"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">استان *</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="voxcina-input w-full"
                  required
                  disabled={loadingProvinces}
                >
                  <option value="">انتخاب استان</option>
                  {loadingProvinces ? (
                    <option value="">در حال بارگذاری...</option>
                  ) : (
                    provinces.map((p) => (
                      <option key={p.province_code} value={p.province_name}>
                        {p.province_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">شهر *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="voxcina-input w-full"
                  required
                  disabled={loadingCities}
                >
                  <option value="">انتخاب شهر</option>
                  {loadingCities ? (
                    <option value="">در حال بارگذاری...</option>
                  ) : (
                    cities.map((c) => (
                      <option key={c.city_code} value={c.city_name}>
                        {c.city_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <Input
              label="آدرس کامل"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />

            <Input
              label="کد پستی"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              required
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="ml-2 h-4 w-4 rounded text-primary focus:ring-primary/30"
              />
              <label htmlFor="isDefault" className="text-sm hover:text-primary transition-colors duration-200 cursor-pointer">
                تنظیم به عنوان آدرس پیش‌فرض
              </label>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="hover:bg-secondary"
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary">
                {editingAddress ? "ویرایش آدرس" : "افزودن آدرس"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CheckoutForm;