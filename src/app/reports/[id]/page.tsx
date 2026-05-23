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
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="flex-1 lg:ml-56 flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-zinc-400">ไม่พบรายการนี้</p>
        <Link href="/" className="text-orange-400 text-sm hover:underline">กลับหน้าหลัก</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-56 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back */}
        <div className="flex items-center justify-between pt-10 lg:pt-0">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Main detail card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          {editing ? (
            /* ---- Edit mode ---- */
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Problem</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Detail</label>
                <textarea
                  value={editDetail}
                  onChange={e => setEditDetail(e.target.value)}
                  rows={5}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">Level</label>
                <div className="flex flex-wrap gap-2">
                  {(["Critical", "High", "Medium", "Low"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditSeverity(s)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-all
                        ${editSeverity === s ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-zinc-700 text-zinc-500"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-2">File Link</label>
                <input
                  value={editDriveLink}
                  onChange={e => setEditDriveLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 placeholder-zinc-600"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            /* ---- View mode ---- */
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-xl font-bold text-zinc-100">{report.title}</h1>
                <SeverityBadge severity={report.severity} />
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-widest">Department</span>
                  <p className="text-zinc-300">{report.department.name}</p>
                </div>
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-widest">Type</span>
                  <p className="text-zinc-300">{report.reportType.name}</p>
                </div>
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-widest">Status</span>
                  <div className="mt-0.5"><StatusBadge status={report.status} /></div>
                </div>
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-widest">Created by</span>
                  <p className="text-zinc-300">{report.createdBy.fullName}</p>
                </div>
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-widest">Date</span>
                  <p className="text-zinc-300">{formatDate(report.createdAt)}</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Detail</p>
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{report.detail}</p>
              </div>

              {report.driveLink && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">File / Drive Link</p>
                  <a
                    href={report.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    เปิดไฟล์แนบ
                  </a>
                </div>
              )}

              {report.resolution && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Resolution</p>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{report.resolution}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Status update card — admin only */}
        {profile?.isAdmin && !editing && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 tracking-wide">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {(["Pending", "In Progress", "Resolved"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-all
                    ${newStatus === s ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Resolution note</label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                rows={3}
                placeholder="บันทึกวิธีแก้ไข..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-orange-500 placeholder-zinc-600 resize-none"
              />
            </div>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl w-full max-w-sm mx-4">
            <p className="text-zinc-100 font-semibold mb-1">ลบรายการนี้?</p>
            <p className="text-zinc-500 text-sm mb-5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">No</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
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
      <div className="flex min-h-screen bg-zinc-950">
        <Sidebar />
        <ReportDetailContent />
      </div>
    </ProtectedRoute>
  );
}