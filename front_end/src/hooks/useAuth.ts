import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export const useAuth = ({
  requiredAuth = false,
  redirectUrl = "/sign-in",
} = {}) => {
  const {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    isLoading,
    error,
  } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (requiredAuth && !isAuthenticated && !isLoading) {
      router.push(redirectUrl);
    }
  }, [requiredAuth, isAuthenticated, isLoading, router, redirectUrl]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUser,
  };
};
