import { useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { UserProfile } from "../types";

// ─────────────────────────────────────────────────────────────
// จับคู่บัญชี auth (Google / password) กับโปรไฟล์สมาชิกในระบบ
//
// แนวคิด: คอลเลกชัน "users" คือ allowlist ในตัว
//  - doc ID = อีเมลตัวพิมพ์เล็ก (แอดมินสร้างไว้ล่วงหน้า = อนุญาต)
//  - ถ้า login แล้ว "ไม่เจอ doc ตามอีเมล" → ไม่ใช่สมาชิก → เตะออก
//  - ถ้าเจอ → เติม uid ครั้งแรก (claim) แล้วโหลดโปรไฟล์
//
// รองรับ doc เก่าที่ยัง key ด้วย uid (ระบบ email/password เดิม) ผ่าน fallback
// ─────────────────────────────────────────────────────────────

async function resolveProfile(currentUser: User): Promise<UserProfile | null> {
  const email = currentUser.email?.toLowerCase();

  try {
    // 1) หาโปรไฟล์ตามอีเมล (โมเดลใหม่ / allowlist)
    if (email) {
      const byEmailRef = doc(db, "users", email);
      const byEmailSnap = await getDoc(byEmailRef);
      if (byEmailSnap.exists()) {
        const data = byEmailSnap.data();
        // claim uid ครั้งแรก เพื่อผูกบัญชี auth เข้ากับโปรไฟล์
        if (data.uid !== currentUser.uid) {
          await updateDoc(byEmailRef, { uid: currentUser.uid }).catch(() => {});
        }
        return { ...(data as UserProfile), uid: currentUser.uid, email };
      }
    }

    // 2) fallback: โปรไฟล์เดิมที่ key ด้วย uid (บัญชี email/password ที่แอดมินสร้างไว้ก่อนหน้า)
    const byUidSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (byUidSnap.exists()) {
      return {
        ...(byUidSnap.data() as UserProfile),
        uid: currentUser.uid,
        email: email ?? (byUidSnap.data() as UserProfile).email ?? "",
      };
    }

    // 3) ไม่พบในทั้งสองที่ → ไม่ใช่สมาชิก
    return null;
  } catch (e: any) {
    // Security Rules บล็อกการอ่าน = อีเมลไม่อยู่ใน allowlist หรือยังไม่ได้ publish rules
    if (e?.code === "permission-denied") {
      console.warn(
        "[auth] อ่านโปรไฟล์ไม่ได้ (permission-denied) — เช็ค 2 อย่าง: " +
        "(1) Firestore Rules publish แล้วหรือยัง (2) มี doc users/" + (email ?? "?") + " จริงไหม"
      );
      return null;
    }
    throw e; // error อื่นๆ ปล่อยขึ้นไปจัดการต่อ
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // true เมื่อ login สำเร็จกับ Firebase แต่ "อีเมลไม่ได้อยู่ในระบบ"
  const [unauthorized, setUnauthorized] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const resolved = await resolveProfile(currentUser);
          if (resolved) {
            setUser(currentUser);
            setProfile(resolved);
            setUnauthorized(false);
          } else {
            // อีเมลไม่อยู่ใน allowlist → เตะออกทันที
            setUnauthorized(true);
            setProfile(null);
            setUser(null);
            await signOut(auth).catch(() => {});
          }
        } catch (error) {
          console.error("Error resolving user profile:", error);
          setProfile(null);
          setUser(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        // ไม่รีเซ็ต unauthorized ที่นี่ เพื่อให้ข้อความเตือนยังค้างบนหน้า login
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setUnauthorized(false);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setUnauthorized(false);
    const provider = new GoogleAuthProvider();
    // ให้เลือกบัญชีทุกครั้ง (กันค้าง session เก่า)
    provider.setCustomParameters({ prompt: "select_account" });
    // ใช้ popup: บน localhost วิธีนี้ทำงานได้จริงบน Chrome
    // (COOP เป็นแค่ warning ไม่บล็อก ต่างจาก redirect ที่ติด third-party cookie)
    try {
      await signInWithPopup(auth, provider);
      // ตรวจ allowlist + โหลดโปรไฟล์ ใน onAuthStateChanged
    } catch (error: any) {
      setLoading(false);
      // ผู้ใช้ปิด popup เอง — ไม่ต้อง throw
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      throw error;
    }
  };

  // ตั้งรหัสผ่านครั้งแรก (self-registration)
  // สร้างบัญชี auth ด้วย email/password แล้วปล่อยให้ onAuthStateChanged เช็ค allowlist ต่อ
  // ถ้าอีเมลไม่อยู่ในระบบ → จะถูก signOut + ตั้ง unauthorized เอง (บัญชีที่สร้างจะเข้าถึงข้อมูลไม่ได้เพราะ rules)
  const registerWithPassword = async (email: string, pass: string) => {
    setLoading(true);
    setUnauthorized(false);
    try {
      await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // ส่งอีเมลลิงก์รีเซ็ตรหัสผ่าน (ใช้ได้เฉพาะบัญชีที่มีรหัสผ่าน — บัญชี Google ล้วนจะไม่พบ)
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  const logout = async () => {
    setLoading(true);
    setUnauthorized(false);
    try {
      await signOut(auth);
    } catch (error) {
      setLoading(false);
      console.error("Error signing out:", error);
    }
  };

  return { user, profile, loading, unauthorized, login, loginWithGoogle, registerWithPassword, resetPassword, logout };
}
