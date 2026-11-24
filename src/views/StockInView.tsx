import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  QrCode,
  Calendar,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Search,
  Download,
  ChevronDown,
  FileText,
  Trash2,
  Layers,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { PartItem, StockInPayload, StockInRecord, UserRole } from '../types/inventory';
import { playSuccessBeep } from '../services/sound';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface StockInViewProps {
  parts: PartItem[];
  stockIns: StockInRecord[];
  userRole: UserRole;
  onStockInSubmit: (payload: StockInPayload) => void;
  onDeleteStockIn?: (stockInId: string) => void;
  onOpenScanner: () => void;
  selectedPartFromInventory?: PartItem | null;
  onClearSelectedPart?: () => void;
}

const WARRANTY_PRESETS = [
  'ไม่มีการรับประกัน',
  'รับประกัน 3 เดือน (เสียเปลี่ยนใหม่ภายใน 7 วัน)',
  'รับประกัน 6 เดือน (ตามเงื่อนไขผู้ผลิต)',
  'รับประกัน 1 ปี (เสียเปลี่ยนตัวใหม่ตามเงื่อนไขผู้ผลิต)',
  'รับประกัน 2 ปี (ซ่อม/เปลี่ยนฟรี ยกเว้นไฟกระชากหรืออุบัติเหตุ)',
];

export const StockInView: React.FC<StockInViewProps> = ({
  parts,
  stockIns,
  userRole,
  onStockInSubmit,
  onDeleteStockIn,
  onOpenScanner,
  selectedPartFromInventory,
  onClearSelectedPart,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Sorted parts (Natural ascending by code)
  const sortedParts = useMemo(() => {
    return [...parts].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [parts]);

  // Form states
  const [selectedPartId, setSelectedPartId] = useState<string>(
    selectedPartFromInventory?.id || sortedParts[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(10);
  const [importDate, setImportDate] = useState<string>(todayStr);
  const [vendor, setVendor] = useState<string>('');
  const [warranty, setWarranty] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [previewImagePart, setPreviewImagePart] = useState<PartItem | null>(null);

  // History search & filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<StockInRecord | null>(null);

  React.useEffect(() => {
    if (selectedPartFromInventory) {
      setSelectedPartId(selectedPartFromInventory.id);
    }
  }, [selectedPartFromInventory]);

  const currentPart = useMemo(() => {
    return parts.find((p) => p.id === selectedPartId) || null;
  }, [parts, selectedPartId]);

  // Unique vendor list from existing records
  const uniqueVendors = useMemo(() => {
    const set = new Set<string>();
    stockIns.forEach((rec) => {
      const v = (rec.vendor || rec.supplierOrRef || '').trim();
      if (v && v !== '-') set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [stockIns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPart) {
      alert('กรุณาเลือกรายการอะไหล่');
      return;
    }
    if (quantity <= 0) {
      alert('จำนวนที่นำเข้าต้องมากกว่า 0');
      return;
    }
    if (!importDate) {
      alert('กรุณาระบุวันที่นำเข้า');
      return;
    }
    if (!vendor.trim()) {
      alert('กรุณาระบุชื่อ Vendor / ผู้จำหน่าย');
      return;
    }

    onStockInSubmit({
      partId: currentPart.id,
      quantity: Number(quantity),
      importDate,
      vendor: vendor.trim(),
      warranty: warranty.trim() || 'ไม่มีการรับประกัน',
      notes: notes.trim(),
    });

    playSuccessBeep();
    setSubmitSuccessMsg(
      `บันทึกรับเข้า "${currentPart.name}" จำนวน +${quantity} ${currentPart.unit} จาก ${vendor.trim()} สำเร็จเรียบร้อย!`
    );

    setQuantity(10);
    setVendor('');
    setWarranty('');
    setNotes('');
    if (onClearSelectedPart) onClearSelectedPart();

    setTimeout(() => {
      setSubmitSuccessMsg(null);
    }, 4500);
  };

  // Filtered Stock-In History (newest importDate / timestamp first)
  const filteredStockIns = useMemo(() => {
    return [...stockIns]
      .filter((rec) => {
        const q = historySearch.toLowerCase().trim();
        const recVendor = (rec.vendor || rec.supplierOrRef || '').toLowerCase();
        const recWarranty = (rec.warranty || '').toLowerCase();
        const matchSearch =
          !q ||
          rec.partName.toLowerCase().includes(q) ||
          rec.partId.toLowerCase().includes(q) ||
          rec.barcode.toLowerCase().includes(q) ||
          recVendor.includes(q) ||
          recWarranty.includes(q) ||
          (rec.notes || '').toLowerCase().includes(q);

        const matchVendor =
          vendorFilter === 'all' || (rec.vendor || rec.supplierOrRef || '') === vendorFilter;

        const recDate = rec.importDate || rec.timestamp.slice(0, 10);
        const matchDate = !dateFilter || recDate === dateFilter;

        return matchSearch && matchVendor && matchDate;
      })
      .sort((a, b) => {
        const da = new Date(a.importDate || a.timestamp).getTime();
        const db = new Date(b.importDate || b.timestamp).getTime();
        if (db !== da) return db - da;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [stockIns, historySearch, vendorFilter, dateFilter]);

  // Summary KPIs for filtered history
  const totalImportedQty = useMemo(
    () => filteredStockIns.reduce((sum, rec) => sum + rec.quantity, 0),
    [filteredStockIns]
  );

  const exportHistoryCSV = () => {
    const headers = [
      'รหัสรายการ',
      'วันที่นำเข้า',
      'รหัสอะไหล่',
      'ชื่ออะไหล่',
      'จำนวนที่นำเข้า',
      'หน่วยนับ',
      'Vendor (ผู้จำหน่าย)',
      'การรับประกันและเงื่อนไข',
      'หมายเหตุ',
      'ผู้บันทึก',
      'เวลาที่บันทึกระบบ',
    ];
    const rows = filteredStockIns.map((rec) => [
      rec.id,
      rec.importDate || rec.timestamp.slice(0, 10),
      rec.partId,
      `"${rec.partName.replace(/"/g, '""')}"`,
      rec.quantity,
      rec.unit,
      `"${(rec.vendor || rec.supplierOrRef || '').replace(/"/g, '""')}"`,
      `"${(rec.warranty || '').replace(/"/g, '""')}"`,
      `"${(rec.notes || '').replace(/"/g, '""')}"`,
      `"${rec.recordedBy}"`,
      new Date(rec.timestamp).toLocaleString('th-TH'),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ประวัติรับเข้าอะไหล่_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stock-In Entry Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                บันทึกรับเข้าอะไหล่ (Stock-In Entry)
              </h3>
              <p className="text-[11px] text-emerald-200/90">
                ระบุจำนวน วันที่นำเข้า Vendor และรายละเอียดการรับประกันและเงื่อนไข
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenScanner}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนเลือกอะไหล่</span>
          </button>
        </div>

        {userRole !== 'admin' ? (
          <div className="p-5 bg-amber-50/70 border-t border-amber-100 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                คุณกำลังอยู่ในโหมดพนักงาน สามารถดูประวัติการรับเข้าอะไหล่ทั้งหมดด้านล่างได้ (หากต้องการบันทึกรับเข้าสต๊อก กรุณาสลับสิทธิ์เป็น <strong>แอดมิน</strong> ที่แถบเมนูด้านล่าง)
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
            {submitSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccessMsg}</span>
              </div>
            )}

            {/* 0. Select Part */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                เลือกรายการอะไหล่ที่ต้องการรับเข้า <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-800 text-xs sm:text-sm"
                  >
                    <option value="">-- กดเพื่อเลือกอะไหล่หรือสแกนบาร์โค้ด --</option>
                    {sortedParts.map((part) => (
                      <option key={part.id} value={part.id}>
                        [{part.id}] {part.name} (คงเหลือ: {part.quantity} {part.unit})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {currentPart && (
                <div className="mt-2.5 p-3 rounded-xl border bg-slate-50 border-slate-200/80 flex items-center gap-3">
                  {currentPart.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImagePart(currentPart)}
                      className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-2xs hover:border-emerald-500 transition relative group cursor-pointer"
                      title="คลิกดูรูปภาพตัวอย่างอุปกรณ์"
                    >
                      <img
                        src={currentPart.imageUrl}
                        alt={currentPart.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-bold text-slate-900 truncate">{currentPart.name}</div>
                    <div className="text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
                      <span>
                        รหัส: <strong className="font-mono text-slate-700">{currentPart.id}</strong>
                      </span>
                      <span>
                        หมวดหมู่: <strong className="text-slate-700">{currentPart.category}</strong>
                      </span>
                      <span>
                        ตำแหน่ง: <strong className="text-amber-800">{currentPart.location}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs">
                    <div className="text-[11px] text-slate-500">คงเหลือเดิม → หลังนำเข้า</div>
                    <div className="font-mono font-bold text-sm">
                      <span className="text-slate-600">{currentPart.quantity}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="text-emerald-700">
                        {currentPart.quantity + (Number(quantity) || 0)} {currentPart.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Quantity, 2. Import Date, 3. Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. จำนวน */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. จำนวนที่นำเข้า ({currentPart?.unit || 'หน่วย'}){' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-sm font-bold text-slate-900"
                />
              </div>

              {/* 2. วันที่นำเข้า */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. วันที่นำเข้า <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={importDate}
                    onChange={(e) => setImportDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* 3. Vendor */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  3. Vendor (ผู้จำหน่าย) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    list="vendor-suggestions"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="เช่น บจก. แสงงาม อิเล็คทริค, Mega"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm"
                  />
                  <datalist id="vendor-suggestions">
                    {uniqueVendors.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* 4. การรับประกันและเงื่อนไข */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
              <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>4. การรับประกันและเงื่อนไข</span>
              </label>

              {/* Quick warranty chips */}
              <div className="flex flex-wrap gap-1.5">
                {WARRANTY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWarranty(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                      warranty === preset
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="ระบุระยะเวลารับประกันและเงื่อนไข เช่น รับประกัน 1 ปี เสียเปลี่ยนใหม่ภายใน 7 วัน (ไม่รวมกรณีไฟกระชากหรือดัดแปลงสภาพ)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm"
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม / เลขที่เอกสาร (PO / Invoice)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น PO-2026-091, ตรวจรับครบถ้วน"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={!currentPart}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันรับเข้าอะไหล่ (เพิ่มสต๊อก & บันทึกประวัติ)</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stock-In History Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>ประวัติการรับเข้าอะไหล่ (Stock-In History)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {filteredStockIns.length} รายการ
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงจำนวนที่นำเข้า วันที่นำเข้า Vendor และเงื่อนไขการรับประกันของอะไหล่ทุกรายการ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportHistoryCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-500 text-[11px]">จำนวนครั้งที่รับเข้า</div>
            <div className="font-mono font-bold text-slate-900 text-base sm:text-lg mt-0.5">
              {filteredStockIns.length.toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <div className="text-emerald-800 text-[11px]">ยอดรวมจำนวนที่นำเข้า</div>
            <div className="font-mono font-bold text-emerald-700 text-base sm:text-lg mt-0.5">
              +{totalImportedQty.toLocaleString('th-TH')} <span className="text-xs font-normal text-emerald-600">หน่วย</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-slate-500 text-[11px]">จำนวน Vendor</div>
            <div className="font-mono font-bold text-slate-900 text-base sm:text-lg mt-0.5">
              {uniqueVendors.length.toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">ราย</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="ค้นหาชื่ออะไหล่, รหัส, Vendor, การรับประกัน..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">ทุก Vendor</option>
            {uniqueVendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <div className="relative flex items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              title="กรองตามวันที่นำเข้า"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="ml-1 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                title="ล้างตัวกรองวันที่"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stock-In History Table */}
        <div className="overflow-x-auto pt-1">
          {filteredStockIns.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              ไม่พบประวัติการรับเข้าอะไหล่ตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">วันที่นำเข้า</th>
                  <th className="py-2.5 px-3">รายการอะไหล่</th>
                  <th className="py-2.5 px-3 text-center">จำนวน</th>
                  <th className="py-2.5 px-3">Vendor (ผู้จำหน่าย)</th>
                  <th className="py-2.5 px-3">การรับประกันและเงื่อนไข</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">ผู้บันทึก / หมายเหตุ</th>
                  {userRole === 'admin' && onDeleteStockIn && (
                    <th className="py-2.5 px-3 text-right">จัดการ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStockIns.map((record) => {
                  const matchedPart = parts.find((p) => p.id === record.partId);
                  const displayVendor = record.vendor || record.supplierOrRef || '-';
                  const displayWarranty = record.warranty || '-';
                  const displayDate = record.importDate || record.timestamp.slice(0, 10);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition">
                      {/* 2. วันที่นำเข้า */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{formatThaiDate(displayDate)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 pl-5">
                          บันทึก {new Date(record.timestamp).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} น.
                        </div>
                      </td>

                      {/* อะไหล่ */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {matchedPart?.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImagePart(matchedPart)}
                              className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 hover:border-emerald-500 hover:shadow-xs transition cursor-pointer"
                              title="คลิกดูรูปภาพอุปกรณ์"
                            >
                              <img
                                src={matchedPart.imageUrl}
                                alt={record.partName}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {record.partName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {record.partId} | {record.barcode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 1. จำนวน */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center font-bold font-mono text-xs sm:text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                          +{record.quantity.toLocaleString('th-TH')} {record.unit}
                        </span>
                      </td>

                      {/* 3. Vendor */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{displayVendor}</span>
                        </div>
                      </td>

                      {/* 4. การรับประกันและเงื่อนไข */}
                      <td className="py-3 px-3 max-w-[260px]">
                        <div className="inline-flex items-start gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900 text-[11px] leading-snug">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{displayWarranty}</span>
                        </div>
                      </td>

                      {/* Recorder / Notes */}
                      <td className="py-3 px-3 hidden lg:table-cell text-slate-600">
                        <div className="font-medium text-slate-800">{record.recordedBy}</div>
                        {record.notes && (
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {record.notes}
                          </div>
                        )}
                      </td>

                      {/* Delete/Void Stock-In (Admin) */}
                      {userRole === 'admin' && onDeleteStockIn && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmRecord(record)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="ยกเลิก/ลบประวัติรับเข้านี้ (หักยอดที่รับเข้าคืน)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete/Void Confirmation Modal */}
      {deleteConfirmRecord && onDeleteStockIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">ยืนยันการลบประวัติรับเข้า?</h4>
                <p className="text-xs text-slate-500">
                  ระบบจะลบประวัตินี้และหักยอดคงเหลือออก {deleteConfirmRecord.quantity}{' '}
                  {deleteConfirmRecord.unit}
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">{deleteConfirmRecord.partName}</div>
              <div className="text-slate-600">
                จำนวน: <strong>+{deleteConfirmRecord.quantity} {deleteConfirmRecord.unit}</strong> | Vendor:{' '}
                <strong>{deleteConfirmRecord.vendor || deleteConfirmRecord.supplierOrRef}</strong>
              </div>
              <div className="text-slate-500">
                วันที่นำเข้า: {formatThaiDate(deleteConfirmRecord.importDate || deleteConfirmRecord.timestamp.slice(0, 10))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRecord(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStockIn(deleteConfirmRecord.id);
                  setDeleteConfirmRecord(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                ยืนยันลบและปรับยอด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      <ImagePreviewModal
        part={previewImagePart}
        onClose={() => setPreviewImagePart(null)}
      />
    </div>
  );
};
