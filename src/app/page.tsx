"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Sidebar from "../components/Sidebar";
import ReportTable from "../components/ReportTable";

// ✅ DashboardContent อยู่ใน Suspense boundary
// ทำให้ทั้ง Sidebar และ ReportTable ที่ใช้ useSearchParams() ทำงานได้
function DashboardContent() {
  const searchParams = useSearchParams();
  const deptId = searchParams.get("dept") || undefined;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 pt-10 lg:pt-0">
            <p
              className="mb-1 text-[10.5px] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              Problem Log
            </p>
            <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: "2px solid var(--border-bright)" }}>
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {deptId ? "รายงานตามฝ่าย" : "รายงานทั้งหมด"}
              </h1>
            </div>
            <p className="text-[13px] mt-2" style={{ color: "var(--text-secondary)" }}>
              บันทึกและติดตามปัญหาที่เจอระหว่างทำรถ — ไว้ย้อนกลับมาอ่านได้ทั้งทีม
            </p>
          </div>

          <ReportTable filterDeptId={deptId} />
        </div>
      </main>
    </div>
  );
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
    <div
      className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
    />
  </div>
);

export default function HomePage() {
  return (
    <ProtectedRoute>
      {/* Suspense ครอบทั้ง DashboardContent
          เพราะ Sidebar ข้างในก็ใช้ useSearchParams() ด้วย */}
      <Suspense fallback={<LoadingFallback />}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}