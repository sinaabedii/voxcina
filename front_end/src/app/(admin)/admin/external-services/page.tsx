"use client";

import ExternalServicesManager from "@/components/admin/ExternalServicesManager";
import { AdminLoading } from "@/components/admin/ui";
import { useAuthStore } from "@/store/auth-store";

/**
 * External services admin page: create/remove API-key services (Telegram bot,
 * Bale, Instagram) and manage their keys, webhooks and identities.
 *
 * The list itself is client-side (admin token from the auth store), so this
 * wrapper only keeps the page from rendering before the admin layout's auth
 * gate has resolved and the manager would fire a doomed fetch.
 */
export default function AdminExternalServicesPage() {
  const { adminToken } = useAuthStore();

  if (!adminToken) {
    return (
      <div className="max-w-5xl mx-auto">
        <AdminLoading message="در حال بررسی دسترسی..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ExternalServicesManager />
    </div>
  );
}
