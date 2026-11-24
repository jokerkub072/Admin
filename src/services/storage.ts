import { PartItem, RequisitionRecord, StockInRecord, UserRole } from '../types/inventory';
import { MASTER_100Y_PARTS } from '../data/masterParts';

const STORAGE_KEY_PARTS = 'master_store100y_parts_v6';
const STORAGE_KEY_REQUISITIONS = 'master_store100y_requisitions_v3';
const STORAGE_KEY_STOCK_IN = 'master_store100y_stock_in_v3';
const STORAGE_KEY_ROLE = 'spareparts_user_role_v1';
const STORAGE_KEY_USER_NAME = 'spareparts_user_name_v1';
const STORAGE_KEY_SHEETS_CONFIG = 'spareparts_sheets_config_v1';

/**
 * Natural comparator for part codes (EE01-01, EE01-02, ..., EE02-01, ..., EE44)
 */
export function naturalSortParts(parts: PartItem[]): PartItem[] {
  return [...parts].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );
}

// Initial realistic requisitions referencing the sample item
const INITIAL_REQUISITIONS: RequisitionRecord[] = [
  {
    id: 'REQ-2026-001',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    partId: 'EE01-01',
    partName: 'หลอดไฟ LED T8 / HIET / 18W / 3000K Warm White (ตัวอย่าง)',
    barcode: 'EE01-01',
    quantity: 5,
    unit: 'หลอด',
    requesterName: 'สมชาย รักการช่าง',
    department: 'แผนกซ่อมบำรุง (Maintenance)',
    workOrderOrPurpose: 'ทดสอบระบบเบิกอะไหล่',
    recordedBy: 'ผู้ดูแลคลังสโตร์',
    status: 'completed',
    notes: 'ตัวอย่างบันทึกการเบิกอะไหล่',
  },
];

const INITIAL_STOCK_IN: StockInRecord[] = [
  {
    id: 'STK-IN-001',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    importDate: new Date(Date.now() - 3600000 * 24).toISOString().slice(0, 10),
    partId: 'EE01-01',
    partName: 'หลอดไฟ LED T8 / HIET / 18W / 3000K Warm White (ตัวอย่าง)',
    barcode: 'EE01-01',
    quantity: 100,
    unit: 'หลอด',
    vendor: 'บจก. แสงงาม อิเล็คทริค',
    warranty: 'รับประกัน 1 ปี (เสียเปลี่ยนตัวใหม่ตามเงื่อนไขผู้ผลิต)',
    supplierOrRef: 'บจก. แสงงาม อิเล็คทริค',
    recordedBy: 'ผู้ดูแลคลังสโตร์',
    notes: 'รับสินค้าตัวอย่างเข้าสต๊อก',
  },
];

export function getLocalParts(): PartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARTS);
    if (!raw) {
      const sorted = naturalSortParts(MASTER_100Y_PARTS);
      saveLocalParts(sorted);
      return sorted;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const sorted = naturalSortParts(MASTER_100Y_PARTS);
      saveLocalParts(sorted);
      return sorted;
    }
    return naturalSortParts(parsed);
  } catch (e) {
    console.error('Error loading parts from storage', e);
    return naturalSortParts(MASTER_100Y_PARTS);
  }
}

export function resetTo100YMasterParts(): PartItem[] {
  const sorted = naturalSortParts(MASTER_100Y_PARTS);
  saveLocalParts(sorted);
  return sorted;
}

export function saveLocalParts(parts: PartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(parts));
  } catch (e) {
    console.error('Error saving parts to storage', e);
  }
}

export function updatePartImageInStorage(partId: string, imageUrl: string): PartItem[] {
  const current = getLocalParts();
  const updated = current.map((p) => {
    if (p.id === partId || p.barcode === partId) {
      return {
        ...p,
        imageUrl,
        updatedAt: new Date().toISOString(),
      };
    }
    return p;
  });
  saveLocalParts(updated);
  return updated;
}

export function getLocalRequisitions(): RequisitionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUISITIONS);
    if (!raw) {
      saveLocalRequisitions(INITIAL_REQUISITIONS);
      return INITIAL_REQUISITIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading requisitions', e);
    return INITIAL_REQUISITIONS;
  }
}

export function saveLocalRequisitions(records: RequisitionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REQUISITIONS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving requisitions', e);
  }
}

export function getLocalStockIn(): StockInRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STOCK_IN);
    if (!raw) {
      saveLocalStockIn(INITIAL_STOCK_IN);
      return INITIAL_STOCK_IN;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_STOCK_IN;
    return parsed.map((rec: StockInRecord) => ({
      ...rec,
      importDate: rec.importDate || (rec.timestamp ? rec.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      vendor: rec.vendor || rec.supplierOrRef || '-',
      warranty: rec.warranty || '-',
    }));
  } catch (e) {
    console.error('Error loading stock in', e);
    return INITIAL_STOCK_IN;
  }
}

export function saveLocalStockIn(records: StockInRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STOCK_IN, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving stock in', e);
  }
}

export function getStoredUserRole(): UserRole {
  try {
    const role = localStorage.getItem(STORAGE_KEY_ROLE);
    if (role === 'admin' || role === 'staff') return role;
    return 'admin';
  } catch {
    return 'admin';
  }
}

export function setStoredUserRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  } catch (e) {
    console.error('Error saving role', e);
  }
}

export function getStoredUserName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_NAME) || 'ผู้ดูแลระบบ (Admin)';
  } catch {
    return 'ผู้ดูแลระบบ (Admin)';
  }
}

export function setStoredUserName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER_NAME, name);
  } catch (e) {
    console.error('Error saving username', e);
  }
}

export function getStoredSpreadsheetId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_SHEETS_CONFIG);
  } catch {
    return null;
  }
}

export function setStoredSpreadsheetId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_SHEETS_CONFIG, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SHEETS_CONFIG);
    }
  } catch (e) {
    console.error('Error saving spreadsheet id', e);
  }
}
