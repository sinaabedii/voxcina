"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  Users,
  Smartphone,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/user";

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  isLoading?: boolean;
  title?: string;
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  isOpen,
  onClose,
  users,
  selectedUserIds,
  onSelectionChange,
  isLoading = false,
  title = "انتخاب کاربران",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    new Set(selectedUserIds)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Reset local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(new Set(selectedUserIds));
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [isOpen, selectedUserIds]);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        user.phone.includes(term)
    );
  }, [users, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const toggleUser = (userId: string) => {
    const newSelection = new Set(localSelectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setLocalSelectedIds(newSelection);
  };

  const selectAll = () => {
    const newSelection = new Set(localSelectedIds);
    filteredUsers.forEach((user) => newSelection.add(user.id));
    setLocalSelectedIds(newSelection);
  };

  const deselectAll = () => {
    const newSelection = new Set(localSelectedIds);
    filteredUsers.forEach((user) => newSelection.delete(user.id));
    setLocalSelectedIds(newSelection);
  };

  const handleConfirm = () => {
    onSelectionChange(Array.from(localSelectedIds));
    onClose();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("fa-IR");
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                {title}
              </h3>
              <Badge
                variant="secondary"
                className="bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/30 dark:text-voxcina-cream"
              >
                {localSelectedIds.size} انتخاب شده
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/30 transition-colors"
            >
              <X className="w-5 h-5 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام، ایمیل یا شماره تماس..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-10 p-2.5 bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                {filteredUsers.length} کاربر یافت شد
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  انتخاب همه
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  لغو انتخاب همه
                </Button>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="text-center py-12 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                کاربری یافت نشد
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      localSelectedIds.has(user.id)
                        ? "border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5"
                        : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/30 dark:hover:border-voxcina-cream/30"
                    }`}
                    onClick={() => toggleUser(user.id)}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        localSelectedIds.has(user.id)
                          ? "bg-voxcina-blue border-voxcina-blue dark:bg-voxcina-cream dark:border-voxcina-cream"
                          : "border-voxcina-blue/30 dark:border-voxcina-cream/30"
                      }`}
                    >
                      {localSelectedIds.has(user.id) && (
                        <Check className="w-3 h-3 text-white dark:text-voxcina-blue" />
                      )}
                    </div>

                    {/* Avatar */}
                    <img
                      src={
                        user.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name
                        )}&background=random&color=fff`
                      }
                      alt={user.name}
                      className="w-10 h-10 rounded-full"
                    />

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-voxcina-blue dark:text-voxcina-cream truncate">
                          {user.name}
                        </span>
                        {user.hasMobileApp && (
                          <Smartphone className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 truncate">
                        {user.phone}
                        {user.email && ` • ${user.email}`}
                      </div>
                    </div>

                    {/* Registration Date */}
                    <div className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 hidden sm:block">
                      {formatDate(user.createdAt)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-3 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                صفحه {currentPage} از {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
            >
              تایید انتخاب ({localSelectedIds.size})
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserSelectionModal;
