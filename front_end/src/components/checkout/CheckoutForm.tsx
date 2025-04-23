import React, { useState, useEffect } from "react";
import { MapPin, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Address } from "@/store/dashboard-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { PROVINCES } from "@/lib/constants";

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

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>آدرس تحویل سفارش</CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                هنوز آدرسی ثبت نکرده‌اید
              </p>
              <Button variant="primary" onClick={handleAddNew}>
                <Plus className="w-4 h-4 ml-2" />
                افزودن آدرس جدید
              </Button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`border rounded-md p-4 cursor-pointer transition-colors ${
                      selectedAddressId === address.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/30"
                    }`}
                    onClick={() => onSelectAddress(address)}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        id={`address-${address.id}`}
                        checked={selectedAddressId === address.id}
                        onChange={() => onSelectAddress(address)}
                        className="ml-2"
                      />
                      <label
                        htmlFor={`address-${address.id}`}
                        className="flex items-center font-medium"
                      >
                        <MapPin className="w-4 h-4 ml-1" />
                        {address.title}
                        {address.isDefault && (
                          <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            پیش‌فرض
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="text-sm text-muted-foreground mr-6">
                      <p>
                        {address.firstName} {address.lastName}
                      </p>
                      <p className="mt-1">
                        {address.province}، {address.city}، {address.address}
                      </p>
                      <p className="mt-1">کد پستی: {address.postalCode}</p>
                      <p className="mt-1">شماره تماس: {address.phoneNumber}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={handleAddNew}>
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
                <label className="text-sm font-medium block mb-1">استان</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">انتخاب استان</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="شهر"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
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
                className="ml-2 h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm">
                تنظیم به عنوان آدرس پیش‌فرض
              </label>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
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
