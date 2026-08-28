"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../hooks/useAuth";
import { useReports } from "../../../hooks/useReports";
import { ReportLog } from "../../../types";
import { SeverityBadge, StatusBadge } from "../../../components/ReportTable";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";
import Link from "next/link";

function ReportDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { deleteReport } = useReports();
  const router = useRouter();

  const [report, setReport] = useState<ReportLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editDriveLink, setEditDriveLink] = useState("");
  const [editSeverity, setEditSeverity] = useState<ReportLog["severity"]>("Medium");
  const [saving, setSaving] = useState(false);

  // Status update (admin)
  const [newStatus, setNewStatus] = useState<ReportLog["status"]>("Pending");
  const [resolution, setResolution] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const snap = await getDoc(doc(db, "reports", id));
        if (!snap.exists()) { setNotFound(true); return; }
        const data = {
          id: snap.id,
          ...snap.data(),
          createdAt: snap.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: snap.data().updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
        } as ReportLog;
        setReport(data);
        setNewStatus(data.status);
        setResolution(data.resolution || "");
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const canEdit = report && (profile?.isAdmin || profile?.uid === report.createdBy.uid);

  const startEdit = () => {
    if (!report) return;
    setEditTitle(report.title);
    setEditDetail(report.detail);
    setEditDriveLink(report.driveLink || "");
    setEditSeverity(report.severity);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "reports", id), {
        title: editTitle,
        detail: editDetail,
        driveLink: editDriveLink,
        severity: editSeverity,
        updatedAt: serverTimestamp(),
      });
      setReport({ ...report, title: editTitle, detail: editDetail, driveLink: editDriveLink, severity: editSeverity });
      setEditing(false);
    } catch (e: any) {
      alert("บันทึกไม่สำเร็จ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!report) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "reports", id), {
        status: newStatus,
        resolution,
        updatedAt: serverTimestamp(),
      });
      setReport({ ...report, status: newStatus, resolution });
    } catch (e: any) {
      alert("อัปเดตสถานะไม่สำเร็จ: " + e.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteReport(id);
      router.push("/");
    } catch {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    } catch { return "-"; }
  };

  if (loading) {
    return (
      <div className="flex-1 lg:ml-56 flex items-center justify-center min-h-screen">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="flex-1 lg:ml-56 flex flex-col items-center justify-center min-h-screen gap-4">
        <p style={{ color: "var(--text-secondary)" }}>ไม่พบรายการนี้</p>
        <Link href="/" className="text-[13px] hover:underline" style={{ color: "var(--text-primary)" }}>กลับหน้าหลัก</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-56 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back */}
        <div className="flex items-center justify-between pt-10 lg:pt-0">
          <Link href="/" className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={startEdit}
                className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                แก้ไข
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowDelete(true)}
                className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ลบ
              </button>
            )}
          </div>
        </div>

        {/* Main detail card */}
        <div
          className="rounded-lg p-6 space-y-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          {editing ? (
            /* ---- Edit mode ---- */
            <div className="space-y-4">
              <div>
                <label className="field-label">Problem</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
                />
              </div>
              <div>
                <label className="field-label">Detail</label>
                <textarea
                  value={editDetail}
                  onChange={e => setEditDetail(e.target.value)}
                  rows={5}
                  className="input-base w-full text-[14px] px-3.5 py-2.5 rounded resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="field-label">Level</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: "Critical", c: "var(--red)" },
                    { v: "High",     c: "var(--orange)" },
                    { v: "Medium",   c: "var(--yellow)" },
                    { v: "Low",      c: "var(--text-secondary)" },
                  ] as const).map(({ v, c }) => {
                    const active = editSeverity === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setEditSeverity(v)}
                        className="px-3.5 py-1.5 rounded text-[13px] font-medium transition-all"
                        style={{
                          border: `1px solid ${active ? c : "var(--border-bright)"}`,
                          color: active ? c : "var(--text-secondary)",
                          background: active ? `color-mix(in srgb, ${c} 10%, transparent)` : "var(--bg-surface)",
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="field-label">File Link</label>
                <input
                  value={editDriveLink}
                  onChange={e => setEditDriveLink(e.target.value)}
                  placeholder="https://..."
                  className="input-base w-full text-[14px] px-3.5 py-2.5 rounded"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="btn-ghost flex-1 px-4 py-2 rounded text-[14px]"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="btn-primary flex-1 px-4 py-2 rounded text-[14px]"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึก"}
                </button>
              </div>
            </div>
          ) : (
            /* ---- View mode ---- */
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{report.title}</h1>
                <SeverityBadge severity={report.severity} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-[14px]">
                {[
                  { label: "Department", value: report.department.name },
                  { label: "Type", value: report.reportType.name },
                  { label: "Created by", value: report.createdBy.fullName },
                  { label: "Date", value: formatDate(report.createdAt) },
                ].map(item => (
                  <div key={item.label}>
                    <span className="field-label" style={{ marginBottom: 2 }}>{item.label}</span>
                    <p style={{ color: "var(--text-primary)" }}>{item.value}</p>
                  </div>
                ))}
                <div>
                  <span className="field-label" style={{ marginBottom: 4 }}>Status</span>
                  <StatusBadge status={report.status} />
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="field-label">Detail</p>
                <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-secondary)" }}>{report.detail}</p>
              </div>

              {report.driveLink && (
                <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="field-label">File / Drive Link</p>
                  <a
                    href={report.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] hover:underline"
                    style={{ color: "var(--blue)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    เปิดไฟล์แนบ
                  </a>
                </div>
              )}

              {report.resolution && (
                <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="field-label" style={{ color: "var(--green)" }}>Resolution · วิธีแก้</p>
                  <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-secondary)" }}>{report.resolution}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Status update card — admin only */}
        {profile?.isAdmin && !editing && (
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>อัปเดตสถานะ</h2>
            <div className="flex flex-wrap gap-2">
              {([
                { v: "Pending", c: "var(--text-secondary)" },
                { v: "In Progress", c: "var(--blue)" },
                { v: "Resolved", c: "var(--green)" },
              ] as const).map(({ v, c }) => {
                const active = newStatus === v;
                return (
                  <button
                    key={v}
                    onClick={() => setNewStatus(v)}
                    className="px-3.5 py-1.5 rounded text-[13px] font-medium transition-all"
                    style={{
                      border: `1px solid ${active ? c : "var(--border-bright)"}`,
                      color: active ? c : "var(--text-secondary)",
                      background: active ? `color-mix(in srgb, ${c} 10%, transparent)` : "var(--bg-surface)",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="field-label">Resolution note · บันทึกวิธีแก้</label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                rows={3}
                placeholder="แก้ยังไง เปลี่ยนอะไร ใครแก้..."
                className="input-base w-full text-[14px] px-3.5 py-2.5 rounded resize-none leading-relaxed"
              />
            </div>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
              className="btn-primary px-5 py-2 rounded text-[14px]"
            >
              {updatingStatus ? "กำลังอัปเดต…" : "อัปเดตสถานะ"}
            </button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShowDelete(false)} />
          <div
            className="relative rounded-lg p-6 w-full max-w-sm animate-fade-up"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-bright)", boxShadow: "var(--shadow)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>ลบรายการนี้?</p>
            <p className="text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>การลบไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="btn-ghost flex-1 px-4 py-2 rounded text-[14px]">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 px-4 py-2 rounded text-[14px]">
                {deleting ? "กำลังลบ…" : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
        <Sidebar />
        <ReportDetailContent />
      </div>
    </ProtectedRoute>
  );
}