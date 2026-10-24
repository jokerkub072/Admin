import { PartItem, RequisitionRecord, StockInRecord } from '../types/inventory';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
}

const SHEET_PARTS_NAME = 'อะไหล่คงเหลือ (Inventory)';
const SHEET_REQ_NAME = 'ประวัติการเบิก (Requisitions)';
const SHEET_STOCK_IN_NAME = 'ประวัติรับเข้าสต๊อก (Stock In)';

/**
 * Creates a brand new Google Spreadsheet with structured sheets and Thai headers.
 */
export async function createInventorySpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  const body = {
    properties: {
      title: `ระบบสต๊อกอะไหล่ - Spare Parts Inventory (${new Date().toLocaleDateString('th-TH')})`,
    },
    sheets: [
      {
        properties: {
          title: SHEET_PARTS_NAME,
          gridProperties: { rowCount: 1500, columnCount: 12, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: SHEET_REQ_NAME,
          gridProperties: { rowCount: 2000, columnCount: 12, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: SHEET_STOCK_IN_NAME,
          gridProperties: { rowCount: 1000, columnCount: 9, frozenRowCount: 1 },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`สร้างสเปรดชีตล้มเหลว: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Push all local parts, requisitions, and stock in records to the Google Spreadsheet.
 */
export async function syncAllToSheets(
  accessToken: string,
  spreadsheetId: string,
  parts: PartItem[],
  requisitions: RequisitionRecord[],
  stockIns: StockInRecord[]
): Promise<void> {
  // Ensure the sheets exist first or fetch spreadsheet info
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error('ไม่พบ Google Spreadsheet ตาม ID ที่ระบุ หรือไม่มีสิทธิ์เข้าถึง');
  }

  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map((s: { properties: { title: string } }) => s.properties.title);

  // If tabs don't exist, create them
  const requestsToAdd: Array<{ addSheet: { properties: { title: string } } }> = [];
  if (!existingSheetTitles.includes(SHEET_PARTS_NAME)) {
    requestsToAdd.push({ addSheet: { properties: { title: SHEET_PARTS_NAME } } });
  }
  if (!existingSheetTitles.includes(SHEET_REQ_NAME)) {
    requestsToAdd.push({ addSheet: { properties: { title: SHEET_REQ_NAME } } });
  }
  if (!existingSheetTitles.includes(SHEET_STOCK_IN_NAME)) {
    requestsToAdd.push({ addSheet: { properties: { title: SHEET_STOCK_IN_NAME } } });
  }

  if (requestsToAdd.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: requestsToAdd }),
    });
  }

  // 1. Prepare Parts rows
  const partsHeader = [
    'รหัสอะไหล่ (ID)',
    'บาร์โค้ด (Barcode)',
    'ชื่ออะไหล่ (Part Name)',
    'หมวดหมู่ (Category)',
    'จำนวนคงเหลือ (Qty)',
    'จุดสั่งซื้อขั้นต่ำ (Min Threshold)',
    'หน่วยนับ (Unit)',
    'ตำแหน่งจัดเก็บ (Location)',
    'ราคาต่อหน่วย (บาท)',
    'รูปภาพ (Image URL)',
    'หมายเหตุ (Notes)',
    'อัปเดตล่าสุด (Last Updated)',
  ];

  const partsRows = parts.map((p) => [
    p.id,
    p.barcode,
    p.name,
    p.category,
    p.quantity,
    p.minThreshold,
    p.unit,
    p.location,
    p.unitPrice,
    p.imageUrl || '',
    p.notes || '',
    new Date(p.updatedAt).toLocaleString('th-TH'),
  ]);

  // 2. Prepare Requisitions rows
  const reqHeader = [
    'รหัสการเบิก (Req ID)',
    'วันเวลาที่เบิก (Timestamp)',
    'รหัสสินค้า (Part ID)',
    'ชื่ออะไหล่ (Part Name)',
    'บาร์โค้ด (Barcode)',
    'จำนวนที่เบิก (Qty)',
    'หน่วย (Unit)',
    'ชื่อผู้เบิก (Requester)',
    'แผนก/ฝ่าย (Department)',
    'เลขที่ใบสั่งงาน/วัตถุประสงค์ (Work Order / Purpose)',
    'ผู้บันทึก (Recorded By)',
    'สถานะ (Status)',
    'หมายเหตุ (Notes)',
  ];

  const reqRows = requisitions.map((r) => [
    r.id,
    new Date(r.timestamp).toLocaleString('th-TH'),
    r.partId,
    r.partName,
    r.barcode,
    r.quantity,
    r.unit,
    r.requesterName,
    r.department,
    r.workOrderOrPurpose,
    r.recordedBy,
    r.status === 'completed' ? 'เบิกสำเร็จ' : 'คืนสต๊อกแล้ว',
    r.notes || '',
  ]);

  // 3. Prepare StockIn rows
  const stockInHeader = [
    'รหัสรายการ (ID)',
    'วันเวลา (Timestamp)',
    'รหัสสินค้า (Part ID)',
    'ชื่ออะไหล่ (Part Name)',
    'จำนวนที่เพิ่ม (Qty)',
    'หน่วย (Unit)',
    'ผู้จัดจำหน่าย/เอกสารอ้างอิง (Supplier / PO)',
    'ผู้บันทึก (Recorded By)',
    'หมายเหตุ (Notes)',
  ];

  const stockInRows = stockIns.map((s) => [
    s.id,
    new Date(s.timestamp).toLocaleString('th-TH'),
    s.partId,
    s.partName,
    s.quantity,
    s.unit,
    s.supplierOrRef || '',
    s.recordedBy,
    s.notes || '',
  ]);

  // Send batch update values
  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: `'${SHEET_PARTS_NAME}'!A1:L${partsRows.length + 1}`,
        values: [partsHeader, ...partsRows],
      },
      {
        range: `'${SHEET_REQ_NAME}'!A1:M${reqRows.length + 1}`,
        values: [reqHeader, ...reqRows],
      },
      {
        range: `'${SHEET_STOCK_IN_NAME}'!A1:I${stockInRows.length + 1}`,
        values: [stockInHeader, ...stockInRows],
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`บันทึกข้อมูลลง Google Sheets ไม่สำเร็จ: ${errText}`);
  }
}

/**
 * Append a single requisition record directly to Google Sheets in real-time
 */
export async function appendRequisitionToSheets(
  accessToken: string,
  spreadsheetId: string,
  record: RequisitionRecord
): Promise<void> {
  const row = [
    record.id,
    new Date(record.timestamp).toLocaleString('th-TH'),
    record.partId,
    record.partName,
    record.barcode,
    record.quantity,
    record.unit,
    record.requesterName,
    record.department,
    record.workOrderOrPurpose,
    record.recordedBy,
    record.status === 'completed' ? 'เบิกสำเร็จ' : 'คืนสต๊อกแล้ว',
    record.notes || '',
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_REQ_NAME}'!A:M:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
}

/**
 * Append a single stock-in record directly to Google Sheets in real-time
 */
export async function appendStockInToSheets(
  accessToken: string,
  spreadsheetId: string,
  record: StockInRecord
): Promise<void> {
  const row = [
    record.id,
    new Date(record.timestamp).toLocaleString('th-TH'),
    record.partId,
    record.partName,
    record.quantity,
    record.unit,
    record.supplierOrRef || '',
    record.recordedBy,
    record.notes || '',
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_STOCK_IN_NAME}'!A:I:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
}
