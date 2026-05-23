import React from 'react';
import clsx from 'clsx';

// กำหนดสเปกว่าตัว Badge นี้สามารถรับค่าความรุนแรงระดับไหนเข้ามาได้บ้าง
interface SeverityBadgeProps {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        {
          // 🔴 ถ้าเป็น Critical ให้แสดงสีแดงเข้ม (สำหรับพวกปัญหา BMS/ระบบหลักพัง)
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800":
            severity === 'Critical',
            
          // 🟠 ถ้าเป็น High ให้แสดงสีส้ม (สำหรับปัญหา RShunt/หน้าคอนแทค)
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800":
            severity === 'High',
            
          // 🟡 ถ้าเป็น Medium ให้แสดงสีเหลือง/ทอง
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800":
            severity === 'Medium',
            
          // 🟢 ถ้าเป็น Low ให้แสดงสีเขียว (ปัญหาทั่วไป)
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800":
            severity === 'Low',
        }
      )}
    >
      {/* จุดวงกลมเล็กๆ ข้างหน้าข้อความเพื่อความสวยงาม */}
      <span
        className={clsx("w-1.5 h-1.5 rounded-full", {
          "bg-red-500": severity === 'Critical',
          "bg-orange-500": severity === 'High',
          "bg-amber-500": severity === 'Medium',
          "bg-emerald-500": severity === 'Low',
        })}
      />
      {severity}
    </span>
  );
}