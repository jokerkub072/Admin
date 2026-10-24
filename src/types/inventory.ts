export type StockStatus = 'out' | 'low' | 'normal';

export interface PartItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number; // จุดสั่งซื้อขั้นต่ำสำหรับการแจ้งเตือน
  unit: string; // e.g. ชิ้น, ตัว, อัน, กล่อง, ชุด, เส้น, ม้วน
  location: string; // เช่น ล็อก A1-02, ชั้น 3-B
  unitPrice: number; // ราคาต่อหน่วย (บาท)
  imageUrl?: string; // รูปตัวอย่างอุปกรณ์
  notes?: string;
  updatedAt: string; // ISO string
}

export interface RequisitionRecord {
  id: string;
  timestamp: string; // ISO string
  partId: string;
  partName: string;
  barcode: string;
  quantity: number;
  unit: string;
  requesterName: string; // ชื่อผู้เบิก
  department: string; // แผนก/ฝ่าย (เช่น ซ่อมบำรุง, แผนกผลิต, แผนกไฟฟ้า)
  workOrderOrPurpose: string; // เลขที่ใบสั่งงาน / วัตถุประสงค์การใช้งาน
  recordedBy: string; // ผู้บันทึกเข้าระบบ
  status: 'completed' | 'returned'; // เบิกแล้ว หรือ คืนสต๊อกแล้ว
  notes?: string;
}

export interface StockInRecord {
  id: string;
  timestamp: string;
  partId: string;
  partName: string;
  barcode: string;
  quantity: number;
  unit: string;
  supplierOrRef?: string; // ผู้จำหน่าย หรือ เลขที่ใบสั่งซื้อ/ใบส่งของ PO#
  recordedBy: string;
  notes?: string;
}

export type UserRole = 'staff' | 'admin';

export interface UserProfile {
  name: string;
  role: UserRole;
  email?: string;
}

export interface SheetsSyncState {
  isConnected: boolean;
  userEmail: string | null;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
  autoSync: boolean;
  error: string | null;
}
