"use client";

import { useState, useEffect } from "react";
import {
  collection, getDocs, doc, deleteDoc, getDoc,
  setDoc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { UserProfile, Department } from "../../../types";
import { useAuth } from "../../../hooks/useAuth";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";

// ---- Types ----
interface MemberForm {
  email: string;
  firstName: string;
  lastName: string;
  studentId: string;
  departmentId: string;
  isAdmin: boolean;
}

const EMPTY_FORM: MemberForm = {
  email: "",
  firstName: "",
  lastName: "",
  studentId: "",
  departmentId: "",
  isAdmin: false,
};

// ---- Shared UI ----
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
      <div
        className="relative rounded-lg w-full max-w-md animate-fade-up"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-bright)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "input-base w-full text-[14px] px-3.5 py-2.5 rounded";

// ---- Main Content ----
function MembersContent() {
  const { resetPassword } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Fetch members & departments
  const fetchData = async () => {
    setLoading(true);
    const [memSnap, deptSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "departments")),
    ]);
    setMembers(memSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError("");
    setShowAdd(true);
  };

  const openEdit = (m: UserProfile) => {
    setEditTarget(m);
    setForm({
      email: m.email ?? "",
      firstName: m.firstName,
      lastName: m.lastName,
      studentId: m.studentId,
      departmentId: m.departmentId,
      isAdmin: m.isAdmin,
    });
    setError("");
  };

  // เพิ่มสมาชิกเข้า allowlist — สร้าง doc ในคอลเลกชัน users โดยใช้ "อีเมล" เป็น ID
  // ไม่ต้องตั้งรหัสผ่าน: สมาชิกล็อกอินด้วย Google (หรือ password ถ้ามีบัญชีอยู่แล้ว)
  // uid จะถูกเติมอัตโนมัติตอนล็อกอินครั้งแรก
  const handleAdd = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.studentId) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, "users", email);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setError("อีเมลนี้มีอยู่ในระบบแล้ว");
        setSaving(false);
        return;
      }
      await setDoc(ref, {
        email,
        studentId: form.studentId,
        firstName: form.firstName,
        lastName: form.lastName,
        departmentId: form.departmentId,
        isAdmin: form.isAdmin,
        createdAt: serverTimestamp(),
      });
      setShowAdd(false);
      await fetchData();
    } catch (e: any) {
      setError("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // แก้ไขโปรไฟล์ใน Firestore (ไม่แตะอีเมล เพราะเป็น ID/ตัวจับคู่บัญชี)
  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.firstName || !form.lastName || !form.studentId) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // docId ของสมาชิก = m.uid ที่ map มาจาก doc.id (อีเมลสำหรับ doc ใหม่, uid สำหรับ doc เก่า)
      await updateDoc(doc(db, "users", editTarget.uid), {
        studentId: form.studentId,
        firstName: form.firstName,
        lastName: form.lastName,
        departmentId: form.departmentId,
        isAdmin: form.isAdmin,
      });
      setEditTarget(null);
      await fetchData();
    } catch (e: any) {
      setError("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ลบสมาชิกออกจาก allowlist (Firestore) — บัญชี Firebase Auth ต้องลบแยกใน Console
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", deleteTarget.uid));
      setDeleteTarget(null);
      await fetchData();
    } catch (e: any) {
      console.error(e);
    }
  };

  // ส่งลิงก์รีเซ็ตรหัสผ่านให้สมาชิก (ใช้ได้กับบัญชีที่มีรหัสผ่านเท่านั้น)
  const handleSendReset = async (m: UserProfile) => {
    if (!m.email) return;
    try {
      await resetPassword(m.email);
      setResetSent(m.email);
      setTimeout(() => setResetSent(null), 4000);
    } catch (e: any) {
      alert(
        e?.code === "auth/user-not-found"
          ? "ส่งไม่ได้ — บัญชีนี้อาจใช้ Google หรือยังไม่เคยตั้งรหัสผ่าน"
          : "ส่งลิงก์ไม่สำเร็จ: " + (e?.message ?? "")
      );
    }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.departName ?? "-";

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.studentId.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6 pt-10 lg:pt-0">
            <p className="mb-1 text-[10.5px] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Admin</p>
            <div className="flex items-end justify-between gap-4 pb-3" style={{ borderBottom: "2px solid var(--border-bright)" }}>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>สมาชิกทีม</h1>
              <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-[14px] flex-shrink-0 mb-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                เพิ่มสมาชิก
              </button>
            </div>
            <p className="text-[13px] mt-2" style={{ color: "var(--text-secondary)" }}>จัดการบัญชีสมาชิกในทีม</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ Student ID..."
              className="input-base w-full text-[14px] pl-9 pr-4 py-2.5 rounded"
            />
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--accent)" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {search ? "ไม่พบสมาชิกที่ค้นหา" : "ยังไม่มีสมาชิก"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-bright)", background: "var(--bg-elevated)" }}>
                      <th className="text-left px-5 py-2.5 text-[10px] font-mono tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Name</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-mono tracking-wider uppercase hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>Student ID</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-mono tracking-wider uppercase hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Department</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-mono tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Role</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, idx) => (
                      <tr key={m.uid} className="group tr-hover" style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{
                                background: m.isAdmin ? "var(--red-dim)" : "var(--blue-dim)",
                                color: m.isAdmin ? "var(--brand)" : "var(--blue)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                            <span style={{ color: "var(--text-primary)" }}>{m.firstName} {m.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>{m.studentId}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{getDeptName(m.departmentId)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="tag"
                            style={{
                              background: m.isAdmin ? "var(--red-dim)" : "var(--bg-elevated)",
                              color: m.isAdmin ? "var(--brand)" : "var(--text-secondary)",
                              borderColor: m.isAdmin ? "color-mix(in srgb, var(--brand) 24%, transparent)" : "var(--border-bright)",
                            }}
                          >
                            {m.isAdmin ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.email && (
                              <button
                                onClick={() => handleSendReset(m)}
                                className="p-1.5 rounded transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                                title="ส่งลิงก์รีเซ็ตรหัสผ่าน"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "var(--blue)"; e.currentTarget.style.background = "var(--blue-dim)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                              title="แก้ไข"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(m)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-dim)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                              title="ลบ"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[12px] font-mono mt-3 text-right" style={{ color: "var(--text-muted)" }}>
            {members.length} สมาชิกทั้งหมด
          </p>
        </div>
      </main>

      {/* Reset-sent toast */}
      {resetSent && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded text-[13px] animate-fade-up"
          style={{ background: "var(--green-dim)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", color: "var(--green)", boxShadow: "var(--shadow)" }}
        >
          ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ {resetSent} แล้ว
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มสมาชิกใหม่">
        <div className="space-y-4">
          <p
            className="text-[12px] px-3 py-2 rounded leading-relaxed"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            ระบุอีเมลที่สมาชิกใช้ล็อกอิน Google — ไม่ต้องตั้งรหัสผ่าน
            บัญชีจะถูกผูกให้อัตโนมัติเมื่อเขาล็อกอินด้วย Google ครั้งแรก
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="ชื่อ">
              <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="ชื่อ" className={inputCls} />
            </FormField>
            <FormField label="นามสกุล">
              <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="นามสกุล" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Student ID">
            <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="6XXXXXXX" className={inputCls} />
          </FormField>
          <FormField label="Email (ใช้ล็อกอิน Google)">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@gmail.com / name@kmitl.ac.th" className={inputCls} />
          </FormField>
          <FormField label="Department">
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
              <option value="">-- เลือก Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.departName}</option>)}
            </select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="w-4 h-4 rounded" style={{ accentColor: "var(--accent)" }} />
            <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>ให้สิทธิ์ Admin</span>
          </label>

          {error && <p className="text-[12px] px-3 py-2 rounded" style={{ color: "var(--red)", background: "var(--red-dim)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1 px-4 py-2.5 rounded text-[14px]">
              ยกเลิก
            </button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 px-4 py-2.5 rounded text-[14px] flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--on-accent) 40%, transparent)", borderTopColor: "var(--on-accent)" }} /> : "เพิ่มสมาชิก"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`แก้ไข — ${editTarget?.firstName} ${editTarget?.lastName}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="ชื่อ">
              <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="นามสกุล">
              <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Student ID">
            <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className={inputCls} />
          </FormField>
          <FormField label="Department">
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
              <option value="">-- เลือก Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.departName}</option>)}
            </select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="w-4 h-4 rounded" style={{ accentColor: "var(--accent)" }} />
            <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>ให้สิทธิ์ Admin</span>
          </label>

          {error && <p className="text-[12px] px-3 py-2 rounded" style={{ color: "var(--red)", background: "var(--red-dim)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditTarget(null)} className="btn-ghost flex-1 px-4 py-2.5 rounded text-[14px]">
              ยกเลิก
            </button>
            <button onClick={handleEdit} disabled={saving} className="btn-primary flex-1 px-4 py-2.5 rounded text-[14px] flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--on-accent) 40%, transparent)", borderTopColor: "var(--on-accent)" }} /> : "บันทึก"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="ยืนยันการลบ">
        <div>
          <p className="text-[14px] mb-1" style={{ color: "var(--text-secondary)" }}>
            ลบสมาชิก <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ?
          </p>
          <p className="text-[12px] mb-5" style={{ color: "var(--text-muted)" }}>ข้อมูลใน Firestore จะถูกลบ (Firebase Auth ต้องลบแยกใน Console)</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 px-4 py-2.5 rounded text-[14px]">
              ยกเลิก
            </button>
            <button onClick={handleDelete} className="btn-danger flex-1 px-4 py-2.5 rounded text-[14px]">
              ลบ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MembersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <MembersContent />
    </ProtectedRoute>
  );
}