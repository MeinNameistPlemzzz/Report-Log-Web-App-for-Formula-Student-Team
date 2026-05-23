"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../hooks/useAuth";
import { useReports } from "../../../hooks/useReports";
import { Department, ReportType } from "../../../types";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";
import Link from "next/link";

function CreateReportForm() {
  const { profile } = useAuth();
  const { createReport } = useReports();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);

  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [severity, setSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [deptId, setDeptId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q1 = query(collection(db, "departments"), orderBy("departName"));
    const q2 = query(collection(db, "reportTypes"), orderBy("typeName"));
    const u1 = onSnapshot(q1, s => setDepartments(s.docs.map(d => ({ id: d.id, ...d.data() } as Department))));
    const u2 = onSnapshot(q2, s => setReportTypes(s.docs.map(d => ({ id: d.id, ...d.data() } as ReportType))));
    return () => { u1(); u2(); };
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("กรุณากรอกชื่อปัญหา"); return; }
    if (!detail.trim()) { setError("กรุณากรอกรายละเอียด"); return; }
    if (!deptId) { setError("กรุณาเลือก Department"); return; }
    if (!typeId) { setError("กรุณาเลือกประเภทรายงาน"); return; }
    if (!profile) return;

    setError("");
    setSubmitting(true);
    try {
      const dept = departments.find(d => d.id === deptId)!;
      const rtype = reportTypes.find(r => r.id === typeId)!;

      await createReport({
        title,
        detail,
        severity,
        status: "Pending",
        driveLink: driveLink.trim(),
        department: { id: dept.id, name: dept.departName },
        reportType: { id: rtype.id, name: rtype.typeName },
        createdBy: { uid: profile.uid, fullName: `${profile.firstName} ${profile.lastName}` },
      });

      router.push("/");
    } catch (e: any) {
      setError("เกิดข้อผิดพลาด: " + e.message);
      setSubmitting(false);
    }
  };

  const severityOptions: Array<{ value: "Critical" | "High" | "Medium" | "Low"; color: string }> = [
    { value: "Critical", color: "border-red-500 text-red-400" },
    { value: "High",     color: "border-orange-500 text-orange-400" },
    { value: "Medium",   color: "border-yellow-500 text-yellow-400" },
    { value: "Low",      color: "border-zinc-500 text-zinc-400" },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 pt-10 lg:pt-0 flex items-center gap-4">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Report Form</h1>
              <p className="text-zinc-500 text-sm">บันทึกปัญหาเทคนิคใหม่</p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Problem title */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Problem *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น BMS Problem, AR Contact Issue..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 placeholder-zinc-600 transition-colors"
              />
            </div>

            {/* Detail */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Detail *</label>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                rows={5}
                placeholder="อธิบายรายละเอียดปัญหา สาเหตุ อาการ..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 placeholder-zinc-600 transition-colors resize-none"
              />
            </div>

            {/* Department + Report Type row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Department *</label>
                <select
                  value={deptId}
                  onChange={e => setDeptId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="">เลือก Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.departName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Type Report *</label>
                <select
                  value={typeId}
                  onChange={e => setTypeId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="">เลือกประเภท</option>
                  {reportTypes.map(r => (
                    <option key={r.id} value={r.id}>{r.typeName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-3">Level *</label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all
                      ${severity === opt.value
                        ? `${opt.color} bg-current/10`
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                      }`}
                    style={severity === opt.value ? { backgroundColor: "rgba(255,255,255,0.04)" } : {}}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Drive Link */}
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">
                Other File Link
                <span className="ml-1 text-zinc-600 normal-case">(Google Drive, etc.)</span>
              </label>
              <input
                type="url"
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 placeholder-zinc-600 transition-colors"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm text-center hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateReportPage() {
  return (
    <ProtectedRoute>
      <CreateReportForm />
    </ProtectedRoute>
  );
}