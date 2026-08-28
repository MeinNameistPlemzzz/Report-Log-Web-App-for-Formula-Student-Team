// 1. ชนิดข้อมูลฝ่ายเทคนิคในชมรม
export interface Department {
  id: string;          
  departName: string;  
  description?: string;
}

// 2. ชนิดข้อมูลหมวดหมู่ประเภทรายงานปัญหา
export interface ReportType {
  id: string;          
  typeName: string;    
}

// 3. ชนิดข้อมูลผู้ใช้งานระบบ
// หมายเหตุ: doc ในคอลเลกชัน "users" ใช้ "อีเมล (ตัวพิมพ์เล็ก)" เป็น ID
// อีเมลคือ allowlist ในตัว — แอดมินสร้าง doc ไว้ก่อน = อนุญาตให้เข้าได้
// ฟิลด์ uid จะถูกเติมอัตโนมัติตอนล็อกอินครั้งแรก ("claim")
export interface UserProfile {
  uid: string;         // auth uid — เติมตอน login ครั้งแรก
  email: string;       // อีเมล = ตัวจับคู่บัญชี Google/password กับโปรไฟล์
  studentId: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  isAdmin: boolean;
  createdAt: string;
}

// 4. ชนิดข้อมูล Log ปัญหาของรถ
export interface ReportLog {
  id: string;          
  title: string;       
  detail: string;      
  severity: 'Critical' | 'High' | 'Medium' | 'Low'; 
  status: 'Pending' | 'In Progress' | 'Resolved';   
  driveLink: string;   
  resolution?: string; 
  
  department: {
    id: string;
    name: string;
  };
  reportType: {
    id: string;
    name: string;
  };
  createdBy: {
    uid: string;
    fullName: string;
  };
  
  createdAt: string;   
  updatedAt: string;   
}