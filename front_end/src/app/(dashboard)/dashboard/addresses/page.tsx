"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, MapPin, Plus } from "lucide-react";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PageLoading } from "@/components/ui/Loading";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageTitle from "@/components/dashboard/ui/PageTitle";
import AddressCard from "@/components/dashboard/addresses/AddressCard";
import AddressFormModal, {
  type AddressFormValues,
} from "@/components/dashboard/addresses/AddressFormModal";
import { useAddress } from "@/hooks/useAddress";
import { useAuthStore } from "@/store/auth-store";
import { slideUpItem, staggerContainer } from "@/lib/motion";
import type { Address } from "@/types/user";

export default function AddressesPage() {
  const {
    addresses,
    isLoading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses,
  } = useAddress();
  const { user } = useAuthStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  const handleSubmit = async (values: AddressFormValues, editing: Address | null) => {
    if (editing) {
      if (!editing.id) throw new Error("آدرس موردنظر یافت نشد");
      await updateAddress(editing.id, values);
      return;
    }
    await addAddress(values);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setIsDeleting(true);
      setOperationLoading(deleteTarget.id);
      await deleteAddress(deleteTarget.id);
      toast.success("آدرس با موفقیت حذف شد");
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("Failed to delete address:", deleteError);
      toast.error("خطا در حذف آدرس. لطفاً دوباره تلاش کنید");
    } finally {
      setIsDeleting(false);
      setOperationLoading(null);
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!address.id) {
      toast.error("شناسه آدرس نامعتبر است");
      return;
    }

    try {
      setOperationLoading(address.id);
      await setDefaultAddress(address.id);
      toast.success("آدرس پیش‌فرض با موفقیت تغییر یافت");
    } catch (defaultError) {
      console.error("Failed to set default address:", defaultError);
      toast.error("خطا در تنظیم آدرس پیش‌فرض. لطفاً دوباره تلاش کنید");
    } finally {
      setOperationLoading(null);
    }
  };

  const handleRetry = () => {
    refreshAddresses().catch(() => {
      // The store records the error; this page renders it from there.
    });
  };

  const showInitialLoading = isLoading && addresses.length === 0;
  const showLoadError = !isLoading && error !== null && addresses.length === 0;

  const renderContent = () => {
    if (showInitialLoading) {
      return <PageLoading text="در حال بارگذاری آدرس‌ها..." />;
    }

    if (showLoadError) {
      return (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-red-500" />}
          title="خطا در بارگذاری آدرس‌ها"
          description={error ?? ""}
          action={
            <Button variant="outline" onClick={handleRetry}>
              تلاش دوباره
            </Button>
          }
        />
      );
    }

    if (addresses.length === 0) {
      return (
        <EmptyState
          icon={<MapPin className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />}
          title="هنوز آدرسی ثبت نکرده‌اید"
          description="برای ثبت سفارش و ارسال محصولات نیاز به حداقل یک آدرس دارید. آدرس خود را اضافه کنید تا تجربه خرید آسان‌تری داشته باشید."
          action={
            <Button variant="primary" onClick={handleAddNew} leftIcon={<Plus className="h-4 w-4" />}>
              افزودن آدرس جدید
            </Button>
          }
        />
      );
    }

    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <p className="mb-4 inline-flex items-center gap-1 rounded-full bg-voxcina-cream px-4 py-2 text-sm text-voxcina-blue/80 dark:bg-voxcina-blue/20 dark:text-voxcina-cream/80">
          <span className="font-bold">{addresses.length}</span>
          آدرس ثبت شده
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {addresses.map((address) => (
            <motion.div key={address.id} variants={slideUpItem} className="h-full">
              <AddressCard
                address={address}
                isBusy={operationLoading === address.id}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onSetDefault={handleSetDefault}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 transition-all duration-500 ease-in-out md:px-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="آدرس‌های من" />
        <Button
          variant="primary"
          onClick={handleAddNew}
          disabled={isLoading}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          افزودن آدرس جدید
        </Button>
      </div>

      {renderContent()}

      <AddressFormModal
        isOpen={isFormOpen}
        editingAddress={editingAddress}
        hasAddresses={addresses.length > 0}
        user={user}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="حذف آدرس"
        description="آیا از حذف این آدرس مطمئن هستید؟ این عمل قابل بازگشت نیست و آدرس به طور کامل حذف خواهد شد."
        confirmLabel="حذف آدرس"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
}
