"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, orderBy, query,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { ReportType, ReportLog } from "../../../types";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";
import { SeverityBadge } from "../../../components/ReportTable";

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCancel} />
      <div className="relative rounded-lg p-6 w-full max-w-xs animate-fade-up"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--border-bright)", boxShadow: "var(--shadow)" }}>
        <div className="w-10 h-10 rounded flex items-center justify-center mb-4"
             style={{ background: "var(--red-dim)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)" }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--red)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>ลบ "{name}" ?</p>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>ไม่สามารถย้อนกลับได้</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2.5 rounded text-sm">ยกเลิก</button>
          <button onClick={onConfirm} className="btn-danger flex-1 py-2.5 rounded text-sm">ลบ</button>
        </div>
      </div>
    </div>
  );
}

function ReportTypesContent() {
  const [types, setTypes] = useState<ReportType[]>([]);
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportType | null>(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "reportTypes"), orderBy("typeName")), snap =>
      setTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportType))));
    const u2 = onSnapshot(query(collection(db, "reports")), snap =>
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportLog))));
    return () => { u1(); u2(); };
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "reportTypes"), { typeName: newName.trim(), createdAt: serverTimestamp() });
      setNewName("");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, "reportTypes", deleteTarget.id));
    setDeleteTarget(null);
  };

  const typeStats = useMemo(() => types.map(t => ({
    ...t,
    total:    reports.filter(r => r.reportType?.id === t.id).length,
    critical: reports.filter(r => r.reportType?.id === t.id && r.severity === "Critical").length,
    high:     reports.filter(r => r.reportType?.id === t.id && r.severity === "High").length,
    pending:  reports.filter(r => r.reportType?.id === t.id && r.status === "Pending").length,
    resolved: reports.filter(r => r.reportType?.id === t.id && r.status === "Resolved").length,
  })), [types, reports]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6 pt-10 lg:pt-0">
            <p className="mb-1 text-[10.5px] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Admin</p>
            <h1 className="text-2xl font-bold pb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", borderBottom: "2px solid var(--border-bright)", letterSpacing: "-0.01em" }}>ประเภทรายงาน</h1>
            <p className="text-[13px] mt-2" style={{ color: "var(--text-secondary)" }}>จัดหมวดหมู่ของปัญหาที่บันทึก</p>
          </div>

          {/* Add form */}
          <div className="rounded-lg p-5 mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="field-label">เพิ่มประเภทใหม่</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="เช่น Battery, Component, BMS..."
                className="input-base flex-1 text-[14px] px-3.5 py-2.5 rounded"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="btn-primary px-5 py-2.5 rounded text-[14px]">
                {adding ? "…" : "เพิ่ม"}
              </button>
            </div>
          </div>

          {/* Type cards */}
          {typeStats.length === 0 ? (
            <div className="rounded-lg py-16 text-center text-sm"
                 style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              ยังไม่มีประเภทรายงาน
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {typeStats.map(t => (
                <div key={t.id} className="group rounded-lg p-5 transition-all"
                     style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                     onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-bright)")}
                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                           style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)", borderLeft: "3px solid var(--brand)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                             style={{ color: "var(--text-secondary)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[14px]" style={{ color: "var(--text-primary)" }}>{t.typeName}</p>
                        <p className="text-[10px] font-mono tracking-wider uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {t.total} reports total
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; (e.currentTarget as HTMLElement).style.background = "var(--red-dim)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Progress bar — resolved vs total */}
                  {t.total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-mono mb-1.5" style={{ color: "var(--text-muted)" }}>
                        <span>Resolved</span>
                        <span>{t.resolved}/{t.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${Math.round((t.resolved / t.total) * 100)}%`, background: "var(--green)" }} />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Total",    value: t.total,    color: "var(--text-primary)" },
                      { label: "Critical", value: t.critical, color: "var(--red)" },
                      { label: "High",     value: t.high,     color: "var(--orange)" },
                      { label: "Pending",  value: t.pending,  color: "var(--yellow)" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg px-2 py-2 text-center"
                           style={{ background: "var(--bg-elevated)" }}>
                        <p className="text-lg font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[9px] font-mono tracking-wider uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-right text-[11px] font-mono mt-4" style={{ color: "var(--text-muted)" }}>
            {types.length} types total
          </p>
        </div>
      </main>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.typeName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default function ReportTypesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <ReportTypesContent />
    </ProtectedRoute>
  );
}