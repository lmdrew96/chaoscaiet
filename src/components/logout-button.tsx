"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export const LogoutButton = (): React.ReactNode => {
  const router = useRouter();
  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch (err) {
      console.error("logout failed", err);
    }
    router.push("/login");
    router.refresh();
  };
  return (
    <button type="button" className="nav-icon cursor-pointer" onClick={logout} aria-label="Log out">
      <LogOut size={24} strokeWidth={2} />
    </button>
  );
};
