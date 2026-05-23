"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ReportLog } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useReports } from "../hooks/useReports";

// ─────────────────────────────────────────
// Severity Badge
// ─────────────────────────────────────────
export const SeverityBadge = ({ severity }: { severity: ReportLog["severity"] }) => {
  const styles: Record<ReportLog["severity"], { bg: string; color: string; dot: string }> = {
    Critical: { bg: "var(--red-dim)",    color: "var(--red)",    dot: "var(--red)"    },
    High:     { bg: "var(--accent-dim)", color: "var(--accent)", dot: "var(--accent)" },
    Medium:   { bg: "var(--yellow-dim)", color: "var(--yellow)", dot: "var(--yellow)" },
    Low:      { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", dot: "var(--text-muted)" },
  };
  const s = styles[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-500 tracking-wider uppercase"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {severity}
    </span>
  );
};

// ─────────────────────────────────────────
// Status Badge (static — used outside table)
// ─────────────────────────────────────────
export const StatusBadge = ({ status }: { status: ReportLog["status"] }) => {
  const styles: Record<ReportLog["status"], { bg: string; color: string }> = {
    Pending:       { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" },
    "In Progress": { bg: "var(--blue-dim)",        color: "var(--blue)"           },
    Resolved:      { bg: "var(--green-dim)",        color: "var(--green)"          },
  };
  const s = styles[status];
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
};

// ─────────────────────────────────────────
// Inline Status Changer — click badge → popover
// ─────────────────────────────────────────
const STATUS_OPTIONS: ReportLog["status"][] = ["Pending", "In Progress", "Resolved"];

const statusStyle: Record<ReportLog["status"], { bg: string; color: string; hoverBg: string }> = {
  Pending:       { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", hoverBg: "rgba(255,255,255,0.08)" },
  "In Progress": { bg: "var(--blue-dim)",        color: "var(--blue)",           hoverBg: "rgba(59,130,246,0.2)"   },
  Resolved:      { bg: "var(--green-dim)",        color: "var(--green)",          hoverBg: "rgba(16,185,129,0.2)"   },
};

interface InlineStatusProps {
  report: ReportLog;
  canEdit: boolean;
}

function InlineStatusBadge({ report, canEdit }: InlineStatusProps) {
  const { updateReportStatus } = useReports();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState<ReportLog["status"] | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ReportLog["status"]>(report.status);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // sync if parent report changes (realtime)
  useEffect(() => {
    setCurrentStatus(report.status);
  }, [report.status]);

  const handleSelect = async (newStatus: ReportLog["status"]) => {
    if (newStatus === currentStatus) { setOpen(false); return; }
    setUpdating(newStatus);
    try {
      await updateReportStatus(report.id, newStatus);
      setCurrentStatus(newStatus);
    } catch {
      // silent — Firestore onSnapshot will revert if it fails
    } finally {
      setUpdating(null);
      setOpen(false);
    }
  };

  const s = statusStyle[currentStatus];

  if (!canEdit) {
    return <StatusBadge status={currentStatus} />;
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Click to change status"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wide transition-all duration-150 group"
        style={{
          background: s.bg,
          color: s.color,
          border: open ? `1px solid ${s.color}` : "1px solid transparent",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = s.hoverBg)
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = s.bg)
        }
      >
        {updating ? (
          <span
            className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin"
            style={{ borderColor: s.color, borderTopColor: "transparent" }}
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
        )}
        {currentStatus}
        {/* chevron */}
        <svg
          className="w-2.5 h-2.5 flex-shrink-0 transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.6 }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute left-0 mt-1.5 z-30 rounded-xl overflow-hidden animate-fade-up"
          style={{
            minWidth: 140,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="px-2.5 py-1.5 text-[9px] font-mono tracking-widest uppercase"
            style={{
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            Change status
          </div>
          {STATUS_OPTIONS.map((opt) => {
            const os = statusStyle[opt];
            const isActive = opt === currentStatus;
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-mono transition-all duration-100"
                style={{
                  background: isActive ? os.bg : "transparent",
                  color: isActive ? os.color : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isActive ? os.color : "var(--text-muted)" }}
                />
                {opt}
                {isActive && (
                  <svg
                    className="w-3 h-3 ml-auto"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    style={{ color: os.color }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[200, 100, 120, 120, 140, 80].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div
          className="shimmer rounded"
          style={{
            width: w,
            height: 14,
            background: "var(--bg-overlay)",
            backgroundSize: "200% 100%",
          }}
        />
      </td>
    ))}
  </tr>
);

// ─────────────────────────────────────────
// Main ReportTable
// ─────────────────────────────────────────
interface ReportTableProps {
  filterDeptId?: string;
}

export default function ReportTable({ filterDeptId }: ReportTableProps) {
  const { profile } = useAuth();
  const { reports, loading, deleteReport } = useReports();

  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<ReportLog["severity"] | "All">("All");
  const [filterStatus, setFilterStatus] = useState<ReportLog["status"] | "All">("All");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (filterDeptId && r.department.id !== filterDeptId) return false;
        if (filterSeverity !== "All" && r.severity !== filterSeverity) return false;
        if (filterStatus !== "All" && r.status !== filterStatus) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.detail.toLowerCase().includes(q) ||
            r.createdBy.fullName.toLowerCase().includes(q) ||
            r.reportType.name.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [reports, filterDeptId, filterSeverity, filterStatus, search]
  );

  const canChangeStatus = (r: ReportLog) =>
    !!(profile?.isAdmin || profile?.uid === r.createdBy.uid);

  const canDelete = (r: ReportLog) =>
    !!(profile?.isAdmin || profile?.uid === r.createdBy.uid);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReport(deleteTarget);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const hasActiveFilter = filterSeverity !== "All" || filterStatus !== "All";

  return (
    <div className="space-y-4 animate-fade-up">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            style={{ color: "var(--text-muted)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px]"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200"
          style={{
            background: showFilters ? "var(--accent-dim)" : "var(--bg-elevated)",
            border: `1px solid ${showFilters ? "rgba(249,115,22,0.3)" : "var(--border)"}`,
            color: showFilters ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-mono text-[11px] tracking-widest uppercase">Filter</span>
          {hasActiveFilter && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          )}
        </button>

        {/* ADD */}
        <Link
          href="/reports/create"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-display tracking-widest uppercase text-[11px]">Add Report</span>
        </Link>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div
          className="flex flex-wrap gap-3 px-4 py-3.5 rounded-xl animate-fade-up"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {[
            { label: "Severity", value: filterSeverity, options: ["All", "Critical", "High", "Medium", "Low"], set: setFilterSeverity },
            { label: "Status",   value: filterStatus,   options: ["All", "Pending", "In Progress", "Resolved"], set: setFilterStatus },
          ].map((f) => (
            <div key={f.label}>
              <p
                className="text-[9px] font-mono tracking-widest uppercase mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                {f.label}
              </p>
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value as any)}
                className="input-base px-3 py-1.5 rounded-lg text-[12px] font-mono"
              >
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          {hasActiveFilter && (
            <button
              className="self-end pb-0.5 text-[11px] font-mono transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => ((e.currentTarget.style.color = "var(--text-secondary)"))}
              onMouseLeave={(e) => ((e.currentTarget.style.color = "var(--text-muted)"))}
              onClick={() => { setFilterSeverity("All"); setFilterStatus("All"); }}
            >
              Clear ×
            </button>
          )}
        </div>
      )}

      {/* Count + hint */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
            {filtered.length} ENTRIES
          </p>
          <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
            คลิก badge Status เพื่อเปลี่ยน
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {/* แก้ไขตรงนี้: เพิ่ม min-h-[260px] เพื่อไม่ให้บีบกล่องสถานะตอนมีข้อมูลน้อยๆ */}
      <div
        className="overflow-x-auto rounded-xl min-h-[260px]"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              {["Problem", "Level", "Type", "Status", "By", "Date", ""].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left text-[9px] font-mono tracking-widest uppercase
                    ${i >= 2 ? "hidden sm:table-cell" : ""}
                    ${i >= 3 ? "hidden md:table-cell" : ""}
                    ${i >= 4 ? "hidden lg:table-cell" : ""}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-16 text-center font-mono text-[12px] tracking-widest uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  No entries found
                </td>
              </tr>
            ) : (
              filtered.map((report, idx) => (
                <tr
                  key={report.id}
                  className="tr-hover transition-colors"
                  style={{
                    borderBottom:
                      idx < filtered.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  {/* Problem */}
                  <td className="px-4 py-3.5">
                    <p
                      className="font-medium truncate max-w-[200px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {report.title}
                    </p>
                    <p
                      className="text-[11px] font-mono truncate max-w-[200px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {report.department.name}
                    </p>
                  </td>

                  {/* Severity */}
                  <td className="px-4 py-3.5">
                    <SeverityBadge severity={report.severity} />
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {report.reportType.name}
                    </span>
                  </td>

                  {/* Status — inline changer */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <InlineStatusBadge
                      report={report}
                      canEdit={canChangeStatus(report)}
                    />
                  </td>

                  {/* By */}
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {report.createdBy.fullName}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(report.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/reports/${report.id}`}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono tracking-wide transition-all duration-150"
                        style={{ color: "var(--accent)" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "var(--accent-dim)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "transparent")
                        }
                      >
                        Detail
                      </Link>
                      {canDelete(report) && (
                        <button
                          onClick={() => setDeleteTarget(report.id)}
                          className="p-1.5 rounded-lg transition-all duration-150"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--red)";
                            (e.currentTarget as HTMLElement).style.background = "var(--red-dim)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative glass-bright rounded-2xl p-6 w-full max-w-xs mx-4 animate-fade-up gradient-border">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: "var(--red-dim)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                style={{ color: "var(--red)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="font-display font-700 mb-1" style={{ color: "var(--text-primary)" }}>
              ลบรายการนี้?
            </p>
            <p className="text-[12px] mb-5" style={{ color: "var(--text-muted)" }}>
              ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-ghost flex-1 py-2.5 rounded-xl text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}