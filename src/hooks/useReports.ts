import { useState, useEffect } from "react";
// 🟢 เปลี่ยนจาก '@/config/firebase' มาเป็นแบบเดินถอยหลังแทน
import { db } from "../config/firebase"; 
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from "firebase/firestore";
// 🟢 เปลี่ยนจาก '@/types' มาเป็นแบบเดินถอยหลังแทน
import { ReportLog } from "../types"; 

export function useReports() {
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
      })) as ReportLog[];
      
      setReports(reportList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createReport = async (data: Omit<ReportLog, "id" | "createdAt" | "updatedAt">) => {
    try {
      await addDoc(collection(db, "reports"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error creating report:", error);
      throw error;
    }
  };

  const updateReportStatus = async (reportId: string, status: 'Pending' | 'In Progress' | 'Resolved', resolution: string = "") => {
    try {
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, {
        status: status,
        resolution: resolution,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating report:", error);
      throw error;
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      await deleteDoc(reportRef);
    } catch (error) {
      console.error("Error deleting report:", error);
      throw error;
    }
  };

  return { reports, loading, createReport, updateReportStatus, deleteReport };
}