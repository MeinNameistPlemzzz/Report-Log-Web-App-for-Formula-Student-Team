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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 w-full max-w-xs shadow-2xl"
           style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--red-dim)" }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--red)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>ลบ "{name}" ?</p>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>ไม่สามารถย้อนกลับได้</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-overlay)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>No</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--red)" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>Delete</button>
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
          <div className="mb-8 pt-10 lg:pt-0">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Report Types</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>จัดการประเภทของรายงานปัญหา</p>
          </div>

          {/* Add form */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
              เพิ่ม Report Type ใหม่
            </p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="เช่น Battery, Component, BMS..."
                className="flex-1 text-sm px-4 py-2.5 rounded-xl focus:outline-none transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "var(--accent)" }}
                onMouseEnter={e => !adding && (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {adding ? "..." : "ADD +"}
              </button>
            </div>
          </div>

          {/* Type cards */}
          {typeStats.length === 0 ? (
            <div className="rounded-2xl py-16 text-center text-sm font-mono tracking-widest uppercase"
                 style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              ยังไม่มี Report Type
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {typeStats.map(t => (
                <div key={t.id} className="group rounded-2xl p-5 transition-all"
                     style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                     onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-bright)")}
                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                             style={{ color: "var(--blue)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t.typeName}</p>
                        <p className="text-[10px] font-mono tracking-widest uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>
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
                      { label: "High",     value: t.high,     color: "var(--accent)" },
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