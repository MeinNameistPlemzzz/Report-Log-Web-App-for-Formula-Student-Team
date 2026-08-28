"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

export default function RegisterPage() {
  const { registerWithPassword, user, unauthorized } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ถ้าเป็นสมาชิก (allowlist ผ่าน) auth จะ resolve แล้วพาเข้าหน้าหลัก
  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setSubmitting(true);
    try {
      await registerWithPassword(email, password);
      // ไม่ push เอง — ปล่อยให้ useEffect ด้านบนจัดการหลัง auth resolve
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("อีเมลนี้มีบัญชีอยู่แล้ว — ไปที่หน้าเข้าสู่ระบบได้เลย");
      } else if (err.code === "auth/invalid-email") {
        setError("รูปแบบอีเมลไม่ถูกต้อง");
      } else if (err.code === "auth/weak-password") {
        setError("รหัสผ่านอ่อนเกินไป (อย่างน้อย 6 ตัวอักษร)");
      } else {
        setError("เกิดข้อผิดพลาด: " + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm animate-fade-up">
        {/* Masthead */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 flex items-center justify-center flex-shrink-0 rounded"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-bright)",
              borderLeft: "3px solid var(--brand)",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              IF
            </span>
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
              INITIAL
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.03em" }}>
              Problem Log · KMITL Formula Student
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-lg p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="mb-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
              ตั้งรหัสผ่านครั้งแรก
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              ใช้อีเมลที่แอดมินเพิ่มเข้าระบบไว้แล้วเท่านั้น
            </p>
          </div>

          {unauthorized && (
            <div
              className="mb-4 px-3.5 py-2.5 rounded text-[13px] animate-fade-in"
              style={{
                background: "var(--yellow-dim)",
                border: "1px solid color-mix(in srgb, var(--yellow) 35%, transparent)",
                color: "var(--yellow)",
              }}
            >
              อีเมลนี้ยังไม่ได้รับสิทธิ์เข้าใช้งาน — ติดต่อแอดมินให้เพิ่มอีเมลของคุณเข้าระบบก่อน
            </div>
          )}

          {error && (
            <div
              className="mb-4 px-3.5 py-2.5 rounded text-[13px] animate-fade-in"
              style={{
                background: "var(--red-dim)",
                border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
                color: "var(--red)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="อีเมลที่ลงทะเบียนไว้กับแอดมิน"
                className="input-base w-full px-3.5 py-2.5 rounded text-[14px]"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="input-base w-full px-3.5 py-2.5 pr-10 rounded text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Confirm Password</label>
              <input
                type={showPass ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                className="input-base w-full px-3.5 py-2.5 rounded text-[14px]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 rounded text-[14px] mt-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "color-mix(in srgb, var(--on-accent) 40%, transparent)", borderTopColor: "var(--on-accent)" }}
                  />
                  กำลังตั้งค่า…
                </>
              ) : (
                "ตั้งรหัสผ่าน & เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="text-center mt-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="hover:underline" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>

        <p className="text-center mt-5 text-[10.5px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
          Automotive Club · KMITL
        </p>
      </div>
    </div>
  );
}
