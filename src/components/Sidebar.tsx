"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { db } from "../config/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Department } from "../types";
import ThemeSwitcher from "./ThemeSwitcher";

// ─────────────────────────────────────────
// Icon helper
// ─────────────────────────────────────────
const Icon = ({ d }: { d: string }) => (
  <svg
    className="w-[15px] h-[15px] flex-shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  folder:   "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  all:      "M4 6h16M4 10h16M4 14h8",
  history:  "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  users:    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:   "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu:     "M4 6h16M4 12h16M4 18h16",
  x:        "M6 18L18 6M6 6l12 12",
};

// ─────────────────────────────────────────
// NavItem — standalone component (NOT nested)
// ─────────────────────────────────────────
interface NavItemProps {
  href: string;
  iconD: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  delay?: string;
}

const NavItem = ({ href, iconD, label, active, onClick, delay = "" }: NavItemProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={[
      "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]",
      "transition-all duration-200 animate-slide-in",
      delay,
      active
        ? "nav-active font-medium"
        : "hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]",
    ].join(" ")}
    style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
    }}
  >
    <Icon d={iconD} />
    <span className="truncate" style={{ fontFamily: "var(--font-body)", letterSpacing: "0.01em" }}>
      {label}
    </span>
    {active && (
      <div
        className="ml-auto w-1 h-1 rounded-full flex-shrink-0"
        style={{ background: "var(--accent)" }}
      />
    )}
  </Link>
);

// ─────────────────────────────────────────
// Section label helper
// ─────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="px-3 pt-2 pb-1.5"
    style={{
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      color: "var(--text-muted)",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </p>
);

// ─────────────────────────────────────────
// Main Sidebar
// ─────────────────────────────────────────
export default function Sidebar() {
  const { profile, logout } = useAuth();
  const pathname = usePathname();

  // ✅ useSearchParams() — reactive, updates on every URL change
  const searchParams = useSearchParams();
  const activeDeptId = searchParams.get("dept"); // null หรือ dept ID จริงๆ

  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Active logic ที่ชัดเจน
  // All Reports = pathname "/" และไม่มี ?dept= ใดๆ
  const isAllActive = pathname === "/" && activeDeptId === null;

  // Department active = pathname "/" และ ?dept= ตรงกับ id นั้น
  const isDeptActive = (id: string) => pathname === "/" && activeDeptId === id;

  // Admin pages — ใช้ pathname ตรงๆ
  const isAdminActive      = pathname === "/admin";
  const isDeptPageActive   = pathname === "/admin/departments";
  const isTypePageActive   = pathname === "/admin/report-types";
  const isMembersActive    = pathname === "/admin/members";

  useEffect(() => {
    const q = query(collection(db, "departments"), orderBy("departName", "asc"));
    return onSnapshot(q, (snap) =>
      setDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department)))
    );
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const close = () => setMobileOpen(false);

  // ─────────────────────────────────────────
  // Sidebar body — JSX (ไม่ใช่ component)
  // หมายเหตุ: ไม่ประกาศเป็น component ซ้อนใน Sidebar
  // เพราะจะทำให้ hooks ทำงานผิดพลาด
  // ─────────────────────────────────────────
  const sidebarBody = (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* ── Logo ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-bright)",
              borderLeft: "3px solid var(--brand)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              IF
            </span>
          </div>
          <div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.02em",
                lineHeight: 1.15,
              }}
            >
              INITIAL
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                lineHeight: 1.3,
              }}
            >
              KMITL Formula Student
            </p>
          </div>
        </div>
      </div>

      {/* ── User chip ── */}
      {profile && (
        <div
          className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: profile.isAdmin ? "var(--accent-dim)" : "var(--blue-dim)",
                color: profile.isAdmin ? "var(--accent)" : "var(--blue)",
                fontSize: 11,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
              }}
            >
              {profile.firstName[0]}
              {profile.lastName[0]}
            </div>
            <div className="min-w-0">
              <p
                className="truncate"
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}
              >
                {profile.firstName} {profile.lastName}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: profile.isAdmin ? "var(--accent)" : "var(--text-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  lineHeight: 1.3,
                }}
              >
                {profile.isAdmin ? "● Admin" : "○ Member"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <SectionLabel>Reports</SectionLabel>

        {/* All Reports */}
        <NavItem
          href="/"
          iconD={ICONS.all}
          label="All Reports"
          active={isAllActive}
          onClick={close}
          delay="delay-75"
        />

        {/* Department links */}
        {departments.map((dept, i) => (
          <NavItem
            key={dept.id}
            href={`/?dept=${dept.id}`}
            iconD={ICONS.folder}
            label={dept.departName}
            active={isDeptActive(dept.id)}   // ✅ ใช้ logic ที่ reactive
            onClick={close}
            delay={`delay-${Math.min((i + 2) * 75, 375)}`}
          />
        ))}

        {/* Admin section */}
        {profile?.isAdmin && (
          <>
            <div className="my-2 mx-1" style={{ borderTop: "1px solid var(--border)" }} />
            <SectionLabel>Admin</SectionLabel>

            <NavItem
              href="/admin"
              iconD={ICONS.history}
              label="History Logs"
              active={isAdminActive}
              onClick={close}
            />
            <NavItem
              href="/admin/departments"
              iconD={ICONS.folder}
              label="Departments"
              active={isDeptPageActive}
              onClick={close}
            />
            <NavItem
              href="/admin/report-types"
              iconD={ICONS.settings}
              label="Report Types"
              active={isTypePageActive}
              onClick={close}
            />
            <NavItem
              href="/admin/members"
              iconD={ICONS.users}
              label="Members"
              active={isMembersActive}
              onClick={close}
            />
          </>
        )}
      </nav>

      {/* ── Theme Switcher ── */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p
          className="mb-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Theme
        </p>
        <ThemeSwitcher />
      </div>

      {/* ── Logout ── */}
      <div className="px-2 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-all duration-200"
          style={{ color: "var(--text-muted)", background: "transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--red)";
            (e.currentTarget as HTMLElement).style.background = "var(--red-dim)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <Icon d={ICONS.logout} />
          <span style={{ fontFamily: "var(--font-body)", letterSpacing: "0.01em" }}>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl transition-colors"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <Icon d={mobileOpen ? ICONS.x : ICONS.menu} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed top-0 left-0 h-screen w-56 z-40",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {sidebarBody}
      </aside>
    </>
  );
}