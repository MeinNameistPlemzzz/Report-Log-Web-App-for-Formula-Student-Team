"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection, onSnapshot, orderBy, query,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { ReportLog, UserProfile } from "../../types";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "../../components/Sidebar";
import { SeverityBadge, StatusBadge } from "../../components/ReportTable";
import Link from "next/link";

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return "-"; }
}

function HistoryContent() {
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<ReportLog["severity"] | "All">("All");
  const [filterStatus, setFilterStatus] = useState<ReportLog["status"] | "All">("All");

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt:  d.data().updatedAt?.toDate?.()?.toISOString()  || new Date().toISOString(),
      } as ReportLog)));
      setLoading(false);
    });
    const q2 = query(collection(db, "users"));
    const unsub2 = onSnapshot(q2, snap => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    return () => { unsub(); unsub2(); };
  }, []);

  const filtered = useMemo(() => reports.filter(r => {
    if (filterSeverity !== "All" && r.severity !== filterSeverity) return false;
    if (filterStatus   !== "All" && r.status   !== filterStatus)   return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) ||
             r.createdBy.fullName.toLowerCase().includes(q) ||
             r.department.name.toLowerCase().includes(q);
    }
    return true;
  }), [reports, filterSeverity, filterStatus, search]);

  // Stats
  const totalReports   = reports.length;
  const criticalCount  = reports.filter(r => r.severity === "Critical").length;
  const resolvedCount  = reports.filter(r => r.status === "Resolved").length;
  const pendingCount   = reports.filter(r => r.status === "Pending").length;

  const stats = [
    { label: "Total Reports", value: totalReports, color: "var(--text-primary)", bg: "var(--bg-elevated)" },
    { label: "Critical",      value: criticalCount, color: "var(--red)",    bg: "var(--red-dim)" },
    { label: "Pending",       value: pendingCount,  color: "var(--yellow)", bg: "var(--yellow-dim)" },
    { label: "Resolved",      value: resolvedCount, color: "var(--green)",  bg: "var(--green-dim)" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8 pt-10 lg:pt-0">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>History Logs</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>ประวัติรายงานปัญหาทั้งหมดในระบบ (Admin view)</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3.5"
                   style={{ background: s.bg, border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                   fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                   style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="ค้นหาชื่อปัญหา, ผู้แจ้ง, ฝ่าย..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl text-[12px] font-mono focus:outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {["All","Critical","High","Medium","Low"].map(o => <option key={o} value={o}>{o === "All" ? "All Severity" : o}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl text-[12px] font-mono focus:outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {["All","Pending","In Progress","Resolved"].map(o => <option key={o} value={o}>{o === "All" ? "All Status" : o}</option>)}
            </select>
          </div>

          <p className="text-[11px] font-mono tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            {filtered.length} ENTRIES
          </p>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                  {["Problem", "Level", "Type", "Status", "Dept", "By", "Date", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[9px] font-mono tracking-widest uppercase"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-3 rounded animate-pulse" style={{ width: [160,80,90,90,100,100,70,40][j], background: "var(--bg-overlay)" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-[12px] font-mono tracking-widest uppercase"
                        style={{ color: "var(--text-muted)" }}>No entries found</td>
                  </tr>
                ) : filtered.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5">
                      <p className="font-medium truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>{r.title}</p>
                    </td>
                    <td className="px-4 py-3.5"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>{r.reportType.name}</span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{r.department.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{r.createdBy.fullName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtDate(r.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/reports/${r.id}`}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono tracking-wide transition-colors"
                            style={{ color: "var(--accent)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <HistoryContent />
    </ProtectedRoute>
  );
}