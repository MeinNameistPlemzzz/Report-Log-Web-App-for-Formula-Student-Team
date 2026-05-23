# INITIAL — EV Racing Log System
## System Flow & Architecture

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS Variables (3-theme system) |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore (NoSQL) |
| File Attachments | Google Drive links (URL only — ไม่ได้เก็บไฟล์ใน Firebase) |
| Hosting | ทำงานแบบ Local Dev / สามารถ Deploy บน Vercel |

---

## Theme System

ระบบรองรับ 3 themes สลับได้จาก sidebar — บันทึกใน `localStorage` ข้ามเซสชัน

| Theme ID | ลักษณะ | Background | Accent |
|----------|--------|------------|--------|
| `dark` | default — dark tech | `#080b10` | Orange `#f97316` |
| `light` | clean light | `#f5f5f0` | Orange `#ea6c0a` |
| `red` | ธีมชมรม INITIAL | `#0f0000` | Crimson `#e03030` |

**ไฟล์ที่เกี่ยวข้อง:**
- `src/context/ThemeContext.tsx` — React context, อ่าน/เขียน `localStorage`, set `data-theme` บน `<html>`
- `src/components/ThemeSwitcher.tsx` — icon-only pill (🌙 ☀️ ⚡) พร้อม `title` tooltip
- `src/globals.css` — CSS variables แยกตาม `[data-theme="dark/light/red"]`
- `src/app/layout.tsx` — ครอบ `<ThemeProvider>` รอบ children ทั้งหมด

**การทำงาน:**
```
ผู้ใช้กดปุ่ม ThemeSwitcher
       │
       ▼
setTheme(id) → ThemeContext
       │
       ├── document.documentElement.setAttribute("data-theme", id)
       └── localStorage.setItem("initial-theme", id)

เมื่อ mount ครั้งแรก:
ThemeProvider อ่าน localStorage → ตั้งค่า theme ทันที (ไม่มี flash)
```

---

## Authentication Flow (การ Login)

```
[ผู้ใช้เปิด URL]
       │
       ▼
ProtectedRoute.tsx ตรวจสอบ Firebase Auth session
       │
       ├── ไม่มี session ──► redirect → /login
       │
       └── มี session ──► ดึง Firestore users/{uid}
                               │
                               ├── isAdmin = true  → เห็นเมนู Admin ใน Sidebar
                               └── isAdmin = false → เห็นแค่เมนู Reports
```

**ไฟล์ที่เกี่ยวข้อง:**
- `src/hooks/useAuth.ts` — ฟัง `onAuthStateChanged` จาก Firebase Auth และดึง profile จาก Firestore
- `src/components/ProtectedRoute.tsx` — wrapper ที่ทุกหน้า protected ใช้
- `src/app/login/page.tsx` — ฟอร์ม Login เรียก `signInWithEmailAndPassword`

---

## Database Structure (Firestore Collections)

### Collection: `users`
เก็บข้อมูลโปรไฟล์สมาชิก (แยกจาก Firebase Auth)

```
users/
  {uid}/                     ← ใช้ UID เดียวกับ Firebase Auth
    studentId:   "6XXXXXXX"
    firstName:   "ชื่อ"
    lastName:    "นามสกุล"
    departmentId: "dept_id"   ← FK → departments/{id}
    isAdmin:     true/false
    createdAt:   Timestamp
```

> **หมายเหตุ:** การสร้าง account ใช้ `createUserWithEmailAndPassword` ผ่าน Secondary Firebase App
> เพื่อไม่ให้ sign in ทับ session ของ Admin ที่กำลัง Login อยู่

---

### Collection: `departments`
เก็บฝ่ายต่างๆ ในทีม

```
departments/
  {departmentId}/
    departName: "High Voltage"
    createdAt:  Timestamp
```

---

### Collection: `reportTypes`
เก็บหมวดหมู่ประเภทปัญหา

```
reportTypes/
  {typeId}/
    typeName:  "Battery"
    createdAt: Timestamp
```

---

### Collection: `reports`  ← หัวใจหลักของระบบ
เก็บรายงานปัญหาทั้งหมด

```
reports/
  {reportId}/
    title:      "BMS Problem"
    detail:     "รายละเอียดปัญหา..."
    severity:   "Critical" | "High" | "Medium" | "Low"
    status:     "Pending" | "In Progress" | "Resolved"
    driveLink:  "https://drive.google.com/..."   ← URL เท่านั้น
    resolution: "วิธีที่แก้ไข..."               ← optional

    department: {             ← snapshot ณ เวลาสร้าง (denormalized)
      id:   "dept_id"
      name: "High Voltage"
    }
    reportType: {             ← snapshot ณ เวลาสร้าง (denormalized)
      id:   "type_id"
      name: "Battery"
    }
    createdBy: {              ← snapshot ณ เวลาสร้าง (denormalized)
      uid:      "user_uid"
      fullName: "ชื่อ นามสกุล"
    }

    createdAt: Timestamp
    updatedAt: Timestamp      ← อัปเดตทุกครั้งที่มีการแก้ไข status/content
```

---

## Page Flow (การเดินทางของผู้ใช้)

### สมาชิกทั่วไป (Member)

```
Login ──► หน้าหลัก (All Reports)
              │
              ├── กรอง/ค้นหา report
              ├── เลือกดูตาม Department (Sidebar)
              ├── ADD Report ──► /reports/create ──► กรอก form ──► บันทึก → Firestore
              ├── View Detail  ──► /reports/{id}
              ├── แก้ไข/ลบ report ของตัวเอง
              └── [NEW] คลิก Status badge ในตาราง ──► เปลี่ยน status inline ได้ทันที
                         (เฉพาะ report ที่ตัวเองสร้าง)
```

### Admin

```
Login ──► หน้าหลัก (All Reports) — เหมือน Member แต่:
              ├── ลบได้ทุก report
              ├── [NEW] คลิก Status badge ทุก report เพื่อเปลี่ยน status inline
              │
              └── เมนู Admin (Sidebar)
                    ├── History Logs    ──► /admin          — ดูทุก report + filter + stats
                    ├── Departments     ──► /admin/departments
                    │     ├── เพิ่ม/ลบ department
                    │     └── ดูสถิติ Members + Reports ต่อ dept
                    ├── Report Types    ──► /admin/report-types
                    │     ├── เพิ่ม/ลบ ประเภทรายงาน
                    │     └── ดูสถิติ + progress bar resolved/total
                    └── Members         ──► /admin/members
                          ├── เพิ่ม account (สร้าง Firebase Auth + Firestore)
                          ├── แก้ไขข้อมูล profile
                          └── ลบสมาชิก (ลบ Firestore — Auth ต้องลบใน Firebase Console)
```

---

## Inline Status Update Flow (Feature ใหม่)

```
ผู้ใช้คลิก Status badge ในตาราง
       │
       ▼
InlineStatusBadge แสดง popover (Pending / In Progress / Resolved)
       │
       ▼
เลือก status ใหม่
       │
       ▼
useReports.updateReportStatus(reportId, newStatus)
       │
       ▼
updateDoc(doc(db, "reports", id), { status, updatedAt: serverTimestamp() })
       │
       ▼
Firestore onSnapshot → ReportTable re-render อัตโนมัติ (real-time)
```

**สิทธิ์การเปลี่ยน status:**
- Owner (createdBy.uid === currentUser.uid) → เปลี่ยน status ของ report ตัวเองได้
- Admin → เปลี่ยน status ของทุก report ได้
- Member อื่น → เห็น badge แต่คลิกไม่ได้ (non-interactive)

**ไฟล์ที่เกี่ยวข้อง:**
- `src/components/ReportTable.tsx` → component `InlineStatusBadge` (อยู่ในไฟล์เดียวกัน)
- `src/hooks/useReports.ts` → function `updateReportStatus(reportId, status, resolution?)`

---

## Data Flow เมื่อสร้าง Report

```
ผู้ใช้กรอก form (/reports/create)
       │
       ▼
useReports.createReport()
       │
       ▼
addDoc(collection(db, "reports"), {
  title, detail, severity, status: "Pending",
  driveLink,
  department: { id, name },    ← lookup จาก state ที่ดึงมาแล้ว
  reportType: { id, name },    ← lookup จาก state ที่ดึงมาแล้ว
  createdBy:  { uid, fullName },← จาก useAuth().profile
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
       │
       ▼
Firestore บันทึก → onSnapshot ใน useReports.ts รับการเปลี่ยนแปลง real-time
       │
       ▼
ReportTable.tsx re-render อัตโนมัติ
```

---

## Real-time vs One-time Queries

| Collection | วิธีดึงข้อมูล | ไฟล์ที่ใช้ |
|------------|--------------|-----------| 
| `reports` | `onSnapshot` (real-time) | `useReports.ts` |
| `departments` | `onSnapshot` (real-time) | `Sidebar.tsx`, หน้า admin ต่างๆ |
| `reportTypes` | `onSnapshot` (real-time) | หน้า create report, admin/report-types |
| `users` | `getDocs` (one-time) หรือ `onSnapshot` | `admin/members`, `useAuth.ts` |

---

## Security Considerations

- **Firebase Auth** ควบคุมว่าใครเข้าระบบได้
- **isAdmin field** ใน Firestore ควบคุมว่าใครเห็นเมนู Admin
- **ProtectedRoute** + `requireAdmin` prop ป้องกัน URL access โดยตรง
- **canChangeStatus** logic ใน ReportTable: owner หรือ admin เท่านั้นที่คลิก inline status ได้
- **Firestore Rules** (ควรตั้งใน Firebase Console):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function isAdmin() {
      return isAuth() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    match /reports/{id} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && (request.auth.uid == resource.data.createdBy.uid || isAdmin());
      allow delete: if isAuth() && (request.auth.uid == resource.data.createdBy.uid || isAdmin());
    }

    match /departments/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }

    match /reportTypes/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }

    match /users/{uid} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
  }
}
```

---

## File Structure Summary

```
src/
├── app/
│   ├── page.tsx                    ← หน้าหลัก All Reports
│   ├── login/page.tsx              ← หน้า Login
│   ├── layout.tsx                  ← ครอบ ThemeProvider
│   ├── reports/
│   │   ├── create/page.tsx         ← ฟอร์มสร้าง Report
│   │   └── [id]/page.tsx           ← หน้า Detail ของ Report
│   └── admin/
│       ├── page.tsx                ← History Logs (Admin only)
│       ├── departments/page.tsx    ← จัดการ Departments
│       ├── report-types/page.tsx   ← จัดการ Report Types
│       └── members/page.tsx        ← จัดการสมาชิก
├── components/
│   ├── Sidebar.tsx                 ← Navigation + ThemeSwitcher
│   ├── ReportTable.tsx             ← ตาราง + filter + delete + inline status
│   ├── ProtectedRoute.tsx          ← Auth guard
│   └── ThemeSwitcher.tsx           ← Icon-only pill switcher (dark/light/red)
├── context/
│   └── ThemeContext.tsx            ← Theme state, localStorage persist, data-theme
├── hooks/
│   ├── useAuth.ts                  ← Firebase Auth state
│   └── useReports.ts               ← CRUD + updateReportStatus
├── config/
│   └── firebase.ts                 ← Firebase init + export
├── types/
│   └── index.ts                    ← TypeScript interfaces
└── globals.css                     ← CSS variables (3 themes) + utility classes
```

---

## Changelog

| วันที่ | การเปลี่ยนแปลง |
|--------|---------------|
| 2026-05-23 | เพิ่ม Theme System (dark/light/red) + ThemeContext + ThemeSwitcher |
| 2026-05-23 | เพิ่ม Inline Status Update — คลิก badge ในตารางเปลี่ยน status ได้ทันที |
| 2026-05-23 | แก้ ThemeSwitcher หลุดกรอบ sidebar — เปลี่ยนเป็น icon-only แบบ flex-1 |
| 2026-05-23 | Redesign UI ทั้งระบบ: Syne + DM Sans + DM Mono, glass cards, CSS animations |