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
export interface UserProfile {
  uid: string;
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