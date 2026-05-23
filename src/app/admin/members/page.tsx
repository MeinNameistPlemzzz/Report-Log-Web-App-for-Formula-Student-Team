"use client";

import { useState, useEffect } from "react";
import {
  collection, getDocs, doc, deleteDoc,
  setDoc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { db } from "../../../config/firebase";
import { UserProfile, Department } from "../../../types";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";

// ---- Types ----
interface MemberForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  departmentId: string;
  isAdmin: boolean;
}

const EMPTY_FORM: MemberForm = {
  email: "",
  password: "",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-zinc-100 font-semibold text-sm tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
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
      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-500 placeholder-zinc-600 transition-colors";

// ---- Main Content ----
function MembersContent() {
  const [members, setMembers] = useState<UserProfile[]>([]);
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
      email: "",
      password: "",
      firstName: m.firstName,
      lastName: m.lastName,
      studentId: m.studentId,
      departmentId: m.departmentId,
      isAdmin: m.isAdmin,
    });
    setError("");
  };

  // Create new member via Firebase Auth + Firestore
  const handleAdd = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.studentId) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (form.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // ใช้ Secondary Firebase App แยกต่างหาก เพื่อไม่ให้ sign in ทับ session admin
      const { firebaseConfig } = await import("../../../config/firebase");
      const SECONDARY = "secondary-creator";
      const existing = getApps().find(a => a.name === SECONDARY);
      const secondaryApp = existing ?? initializeApp(firebaseConfig, SECONDARY);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);

      // sign out และ ลบ secondary app ทันทีหลังสร้างสำเร็จ เพื่อไม่ให้ค้างอยู่
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      await setDoc(doc(db, "users", cred.user.uid), {
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
      if (e.code === "auth/email-already-in-use") setError("อีเมลนี้มีอยู่แล้ว");
      else if (e.code === "auth/invalid-email") setError("รูปแบบอีเมลไม่ถูกต้อง");
      else setError("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit member profile in Firestore only
  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.firstName || !form.lastName || !form.studentId) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setSaving(true);
    setError("");
    try {
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

  // Delete member from Firestore (Auth deletion requires user session — handled gracefully)
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

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.departName ?? "-";

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.studentId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8 pt-10 lg:pt-0 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Members</h1>
              <p className="text-zinc-500 text-sm mt-1">จัดการบัญชีสมาชิกในทีม</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              ADD MEMBER
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ Student ID..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-500 placeholder-zinc-600"
            />
          </div>

          {/* Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-sm">
                {search ? "ไม่พบสมาชิกที่ค้นหา" : "ยังไม่มีสมาชิก"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-5 py-3.5 text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Name</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-mono text-zinc-500 tracking-widest uppercase hidden sm:table-cell">Student ID</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-mono text-zinc-500 tracking-widest uppercase hidden md:table-cell">Department</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Role</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filtered.map(m => (
                      <tr key={m.uid} className="group hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: m.isAdmin ? "rgba(249,115,22,0.12)" : "rgba(59,130,246,0.10)", color: m.isAdmin ? "#f97316" : "#60a5fa" }}
                            >
                              {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                            <span className="text-zinc-200">{m.firstName} {m.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="font-mono text-xs text-zinc-400">{m.studentId}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-zinc-400 text-xs">{getDeptName(m.departmentId)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.isAdmin ? "bg-orange-500/15 text-orange-400" : "bg-zinc-700/50 text-zinc-400"}`}>
                            {m.isAdmin ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="แก้ไข"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(m)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

          <p className="text-zinc-600 text-xs mt-3 text-right">
            {members.length} สมาชิกทั้งหมด
          </p>
        </div>
      </main>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มสมาชิกใหม่">
        <div className="space-y-4">
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
          <FormField label="Email">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@team.com" className={inputCls} />
          </FormField>
          <FormField label="Password">
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="อย่างน้อย 6 ตัวอักษร" className={inputCls} />
          </FormField>
          <FormField label="Department">
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inputCls}>
              <option value="">-- เลือก Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.departName}</option>)}
            </select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="w-4 h-4 accent-orange-500 rounded" />
            <span className="text-zinc-300 text-sm">ให้สิทธิ์ Admin</span>
          </label>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleAdd} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "สร้างบัญชี"}
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
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="w-4 h-4 accent-orange-500 rounded" />
            <span className="text-zinc-300 text-sm">ให้สิทธิ์ Admin</span>
          </label>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleEdit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "บันทึก"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="ยืนยันการลบ">
        <div>
          <p className="text-zinc-300 text-sm mb-1">
            ลบสมาชิก <span className="text-white font-semibold">{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ?
          </p>
          <p className="text-zinc-500 text-xs mb-5">ข้อมูลใน Firestore จะถูกลบ (Firebase Auth ต้องลบแยกใน Console)</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
              No
            </button>
            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors">
              Delete
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