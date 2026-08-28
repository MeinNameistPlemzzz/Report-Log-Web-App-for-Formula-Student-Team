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
    { value: "Critical", color: "var(--red)" },
    { value: "High",     color: "var(--orange)" },
    { value: "Medium",   color: "var(--yellow)" },
    { value: "Low",      color: "var(--text-secondary)" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6 pt-10 lg:pt-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              กลับ
            </Link>
            <p
              className="mb-1 text-[10.5px] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              New Entry
            </p>
            <h1
              className="text-2xl font-bold pb-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", borderBottom: "2px solid var(--border-bright)", letterSpacing: "-0.01em" }}
            >
              บันทึกปัญหาใหม่
            </h1>
          </div>

          {/* Form card */}
          <div
            className="rounded-lg p-6 space-y-5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {error && (
              <div
                className="px-3.5 py-2.5 rounded text-[13px]"
                style={{ background: "var(--red-dim)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", color: "var(--red)" }}
              >
                {error}
              </div>
            )}

            {/* Problem title */}
            <div>
              <label className="field-label">Problem *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น BMS ตัดกลางคัน, หน้าคอนแทค AR ไหม้..."
                className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
              />
            </div>

            {/* Detail */}
            <div>
              <label className="field-label">Detail *</label>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                rows={5}
                placeholder="อาการที่เจอ · สาเหตุที่สงสัย · เกิดตอนไหน..."
                className="input-base w-full text-[14px] px-3.5 py-2.5 rounded resize-none leading-relaxed"
              />
            </div>

            {/* Department + Report Type row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Department *</label>
                <select
                  value={deptId}
                  onChange={e => setDeptId(e.target.value)}
                  className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
                >
                  <option value="">เลือกฝ่าย</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.departName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Report Type *</label>
                <select
                  value={typeId}
                  onChange={e => setTypeId(e.target.value)}
                  className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
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
              <label className="field-label">Level *</label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map(opt => {
                  const active = severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className="px-3.5 py-1.5 rounded text-[13px] font-medium transition-all"
                      style={{
                        border: `1px solid ${active ? opt.color : "var(--border-bright)"}`,
                        color: active ? opt.color : "var(--text-secondary)",
                        background: active ? `color-mix(in srgb, ${opt.color} 10%, transparent)` : "var(--bg-surface)",
                      }}
                    >
                      {opt.value}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drive Link */}
            <div>
              <label className="field-label">
                ลิงก์ไฟล์แนบ <span style={{ textTransform: "none", letterSpacing: 0 }}>(Google Drive, รูป ฯลฯ)</span>
              </label>
              <input
                type="url"
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="btn-ghost flex-1 px-4 py-2.5 rounded text-[14px] text-center"
              >
                ยกเลิก
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 px-4 py-2.5 rounded text-[14px]"
              >
                {submitting ? "กำลังบันทึก…" : "บันทึกรายงาน"}
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