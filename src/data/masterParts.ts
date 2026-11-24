import { PartItem } from "../types/inventory";

export const MASTER_100Y_PARTS: PartItem[] = [
  {
    id: "EE01-01",
    barcode: "EE01-01",
    name: "หลอดไฟ LED T8 / HIET / 18W / 3000K Warm White (ตัวอย่าง)",
    category: "EE",
    quantity: 100,
    minThreshold: 25,
    unit: "หลอด",
    location: "สโตร์ 100 ปี (คลังหลัก)",
    unitPrice: 150,
    notes: "รายการตัวอย่างสำหรับทดสอบระบบ (สามารถเพิ่มหรือแก้ไขได้)",
    updatedAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1550985543-f47f38aee653?auto=format&fit=crop&w=400&q=80"
  }
];
