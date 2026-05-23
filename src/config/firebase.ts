import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 1. ดึงค่าคอนฟิกความปลอดภัยมาจากไฟล์ .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 2. ตรวจสอบและเริ่มต้นการเชื่อมต่อกับ Firebase (ป้องกันการ Initialize ซ้ำ)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 3. เปิดใช้งานระบบยืนยันตัวตน (Auth) และฐานข้อมูล (Firestore)
const auth = getAuth(app);
const db = getFirestore(app);

// 4. ส่งออก (Export) ตัวแปรออกไปให้ไฟล์อื่นๆ (เช่น Hooks) เรียกใช้งาน
export { app, auth, db, firebaseConfig };