"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (requireAdmin && profile && !profile.isAdmin) {
        router.replace("/");
      }
    }
  }, [user, profile, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-7 h-7 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--accent)" }}
          />
          <span
            className="text-[11px] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            Loading
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requireAdmin && profile && !profile.isAdmin) return null;

  return <>{children}</>;
}