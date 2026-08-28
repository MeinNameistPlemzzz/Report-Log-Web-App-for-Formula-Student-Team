"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { login, loginWithGoogle, resetPassword, user, unauthorized } = useAuth();
  const router = useRouter();

  // ไปหน้าหลักก็ต่อเมื่อยืนยันแล้วว่าเป็นสมาชิกจริง (user ถูก set)
  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleReset = async () => {
    setError("");
    setResetMsg("");
    if (!email.trim()) {
      setError("กรอกอีเมลในช่องด้านล่างก่อน แล้วกด “ลืมรหัสผ่าน”");
      return;
    }
    try {
      await resetPassword(email);
      setResetMsg(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${email.trim()} แล้ว — เช็คกล่องอีเมล (รวมทั้ง Spam)`);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("ไม่พบบัญชีรหัสผ่านของอีเมลนี้ — อาจใช้ Google อยู่ หรือยังไม่เคยตั้งรหัสผ่าน");
      } else if (err.code === "auth/invalid-email") {
        setError("รูปแบบอีเมลไม่ถูกต้อง");
      } else {
        setError("ส่งลิงก์ไม่สำเร็จ: " + (err?.message ?? ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      // ไม่ push เอง — ปล่อยให้ useEffect(user) จัดการหลังตรวจสิทธิ์เสร็จ
      // ถ้าอีเมลไม่อยู่ใน allowlist จะขึ้นแถบเหลือง "ติดต่อแอดมิน" แทน
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setError("เกิดข้อผิดพลาด: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // ปล่อยให้ useEffect(user) พาไปหลังตรวจสิทธิ์เสร็จ
    } catch (err: any) {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ: " + (err?.message ?? ""));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
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
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              IF
            </span>
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              INITIAL
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--text-muted)",
                letterSpacing: "0.03em",
              }}
            >
              Problem Log · KMITL Formula Student
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="mb-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
              เข้าสู่ระบบ
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              สำหรับสมาชิกทีมเท่านั้น
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

          {resetMsg && (
            <div
              className="mb-4 px-3.5 py-2.5 rounded text-[13px] animate-fade-in"
              style={{
                background: "var(--green-dim)",
                border: "1px solid color-mix(in srgb, var(--green) 35%, transparent)",
                color: "var(--green)",
              }}
            >
              {resetMsg}
            </div>
          )}

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn-ghost w-full py-2.5 rounded text-[14px] flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {googleLoading ? (
              <span
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--text-primary)" }}
              />
            ) : (
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
            )}
            เข้าสู่ระบบด้วย Google
          </button>

          {/* divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>หรือ</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@team.com"
                className="input-base w-full px-3.5 py-2.5 rounded text-[14px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="field-label">Password</label>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[12px] mb-1.5 hover:underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 rounded text-[14px] mt-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "color-mix(in srgb, var(--on-accent) 40%, transparent)", borderTopColor: "var(--on-accent)" }}
                  />
                  กำลังตรวจสอบ…
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="text-center mt-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
            สมาชิกใหม่ที่แอดมินเพิ่งเพิ่มเข้าระบบ?{" "}
            <Link href="/register" className="hover:underline" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              ตั้งรหัสผ่านครั้งแรก
            </Link>
          </p>
        </div>

        <p
          className="text-center mt-5 text-[10.5px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.03em" }}
        >
          Automotive Club · KMITL
        </p>
      </div>
    </div>
  );
}
