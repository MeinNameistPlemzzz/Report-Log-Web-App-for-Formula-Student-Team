"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Sidebar from "../components/Sidebar";
import ReportTable from "../components/ReportTable";

function DashboardContent() {
  const searchParams = useSearchParams();
  const deptId = searchParams.get("dept") || undefined;

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 pt-10 lg:pt-0">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              {deptId ? "Department Reports" : "All Reports"}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              บันทึกและติดตามปัญหาเทคนิคประจำทีม
            </p>
          </div>

          <ReportTable filterDeptId={deptId} />
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}