import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  QrCode,
  User,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Download,
  Calendar,
  Layers,
  Printer,
  ChevronDown,
  Clock,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react';
import { PartItem, RequisitionRecord, UserRole } from '../types/inventory';
import { playSuccessBeep } from '../services/sound';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface RequisitionViewProps {
  parts: PartItem[];
  requisitions: RequisitionRecord[];
  userRole: UserRole;
  currentUserName: string;
  onRequisitionSubmit: (record: Omit<RequisitionRecord, 'id' | 'timestamp' | 'status'>) => void;
  onVoidRequisition: (reqId: string) => void;
  onOpenScanner: () => void;
  selectedPartFromInventory?: PartItem | null;
  onClearSelectedPart?: () => void;
}

export const RequisitionView: React.FC<RequisitionViewProps> = ({
  parts,
  requisitions,
  userRole,
  currentUserName,
  onRequisitionSubmit,
  onVoidRequisition,
  onOpenScanner,
  selectedPartFromInventory,
  onClearSelectedPart,
}) => {
  // Form states
  const [selectedPartId, setSelectedPartId] = useState<string>(selectedPartFromInventory?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [requesterName, setRequesterName] = useState<string>(
    userRole === 'staff' ? currentUserName : ''
  );
  const [department, setDepartment] = useState<string>('แผนกซ่อมบำรุง (Maintenance)');
  const [workOrderOrPurpose, setWorkOrderOrPurpose] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [previewImagePart, setPreviewImagePart] = useState<PartItem | null>(null);

  // History search & filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [voidConfirmRecord, setVoidConfirmRecord] = useState<RequisitionRecord | null>(null);

  // When a part is selected from outside (e.g. from Inventory view or Barcode Scanner)
  React.useEffect(() => {
    if (selectedPartFromInventory) {
      setSelectedPartId(selectedPartFromInventory.id);
      setQuantity(1);
    }
  }, [selectedPartFromInventory]);

  // Current selected part object
  const currentPart = useMemo(() => {
    return parts.find((p) => p.id === selectedPartId) || null;
  }, [parts, selectedPartId]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPart) return;
    if (quantity <= 0 || quantity > currentPart.quantity) {
      alert(`จำนวนที่เบิกต้องอยู่ระหว่าง 1 ถึง ${currentPart.quantity} ${currentPart.unit}`);
      return;
    }
    if (!requesterName.trim()) {
      alert('กรุณากรอกชื่อผู้เบิกสินค้า');
      return;
    }

    onRequisitionSubmit({
      partId: currentPart.id,
      partName: currentPart.name,
      barcode: currentPart.barcode,
      quantity: Number(quantity),
      unit: currentPart.unit,
      requesterName: requesterName.trim(),
      department: department.trim(),
      workOrderOrPurpose: workOrderOrPurpose.trim() || 'งานซ่อมบำรุงทั่วไป',
      recordedBy: currentUserName,
      notes: notes.trim(),
    });

    playSuccessBeep();
    setSubmitSuccessMsg(
      `บันทึกการเบิก "${currentPart.name}" จำนวน ${quantity} ${currentPart.unit} สำเร็จเรียบร้อย!`
    );

    // Reset form
    setQuantity(1);
    setWorkOrderOrPurpose('');
    setNotes('');
    if (onClearSelectedPart) onClearSelectedPart();

    setTimeout(() => {
      setSubmitSuccessMsg(null);
    }, 4500);
  };

  // Filtered requisitions for report table
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      const q = historySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.requesterName.toLowerCase().includes(q) ||
        req.partName.toLowerCase().includes(q) ||
        req.barcode.toLowerCase().includes(q) ||
        req.department.toLowerCase().includes(q) ||
        req.workOrderOrPurpose.toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q);

      const matchesDept = departmentFilter === 'all' || req.department.includes(departmentFilter);

      return matchesSearch && matchesDept;
    });
  }, [requisitions, historySearch, departmentFilter]);

  // Export Requisition Report to CSV
  const exportReportCSV = () => {
    const headers = [
      'รหัสการเบิก',
      'วันเวลาที่เบิก',
      'ชื่อผู้เบิก',
      'แผนก/ฝ่าย',
      'รหัสอะไหล่',
      'ชื่ออะไหล่',
      'บาร์โค้ด',
      'จำนวนที่เบิก',
      'หน่วย',
      'เลขที่ใบสั่งงาน/วัตถุประสงค์',
      'ผู้บันทึก',
      'สถานะ',
      'หมายเหตุ',
    ];
    const rows = filteredRequisitions.map((r) => [
      r.id,
      `"${new Date(r.timestamp).toLocaleString('th-TH')}"`,
      `"${r.requesterName}"`,
      `"${r.department}"`,
      r.partId,
      `"${r.partName.replace(/"/g, '""')}"`,
      r.barcode,
      r.quantity,
      r.unit,
      `"${r.workOrderOrPurpose.replace(/"/g, '""')}"`,
      `"${r.recordedBy}"`,
      r.status === 'completed' ? 'เบิกแล้ว' : 'คืนสต๊อกแล้ว',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานการเบิกอะไหล่_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Requisition Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">ฟอร์มบันทึกการเบิกอะไหล่ (Spare Part Requisition)</h3>
              <p className="text-xs text-slate-400">สแกนบาร์โค้ดหรือเลือกอะไหล่ ระบุชื่อผู้เบิกและจำนวนที่ใช้</p>
            </div>
          </div>

          <button
            onClick={onOpenScanner}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนบาร์โค้ด</span>
          </button>
        </div>

        {submitSuccessMsg && (
          <div className="m-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submitSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Step 1: Part Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="block font-semibold text-slate-700">
                1. เลือกอะไหล่ที่ต้องการเบิก <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={selectedPartId}
                  onChange={(e) => {
                    setSelectedPartId(e.target.value);
                    setQuantity(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-xs sm:text-sm bg-white"
                >
                  <option value="">-- แตะเพื่อเลือกอะไหล่ หรือสแกนบาร์โค้ด --</option>
                  {[...parts]
                    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((p) => (
                      <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                        [{p.id}] {p.name} (คงเหลือ: {p.quantity} {p.unit}) {p.quantity <= 0 ? '❌ หมดสต๊อก' : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1"
                  title="สแกนผ่านกล้อง"
                >
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">กล้อง</span>
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">
                2. จำนวนที่ต้องการเบิก <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden flex-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-40 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={currentPart ? currentPart.quantity : 9999}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full py-2 text-center focus:outline-none font-mono text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((prev) =>
                        currentPart ? Math.min(currentPart.quantity, prev + 1) : prev + 1
                      )
                    }
                    disabled={!currentPart || quantity >= currentPart.quantity}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-40 font-bold"
                  >
                    +
                  </button>
                </div>
                <span className="text-slate-600 font-medium shrink-0 min-w-[36px]">
                  {currentPart ? currentPart.unit : 'หน่วย'}
                </span>
              </div>
            </div>
          </div>

          {/* Selected Part Details Card with Equipment Thumbnail */}
          {currentPart && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 text-[11px]">
              {currentPart.imageUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewImagePart(currentPart)}
                  className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-2xs hover:border-amber-500 hover:scale-105 transition cursor-pointer group"
                  title="คลิกเพื่อดูรูปภาพตัวอย่างอุปกรณ์ขนาดใหญ่"
                >
                  <img
                    src={currentPart.imageUrl}
                    alt={currentPart.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                  />
                </button>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                <div>
                  <span className="text-slate-400 block">รหัสสินค้า / บาร์โค้ด:</span>
                  <span className="font-mono font-semibold text-slate-800">{currentPart.id}</span>
                  <div className="text-slate-500 font-mono text-[10px]">{currentPart.barcode}</div>
                </div>
                <div>
                  <span className="text-slate-400 block">ตำแหน่งชั้นวาง:</span>
                  <span className="font-semibold text-amber-800">{currentPart.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">คงเหลือปัจจุบัน:</span>
                  <span
                    className={`font-bold font-mono text-xs ${
                      currentPart.quantity <= currentPart.minThreshold ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {currentPart.quantity} {currentPart.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">คงเหลือหลังเบิก:</span>
                  <span className="font-bold font-mono text-xs text-slate-900">
                    {Math.max(0, currentPart.quantity - quantity)} {currentPart.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Requester Details */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล ผู้เบิกสินค้า <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="เช่น สมชาย ช่างกล, วิชัย ซ่อมบำรุง"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">แผนก / ฝ่ายผู้เบิก</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  list="department-list"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="เช่น ซ่อมบำรุง, ผลิต, ไฟฟ้า"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <datalist id="department-list">
                  <option value="แผนกซ่อมบำรุง (Maintenance)" />
                  <option value="แผนกผลิต (Production)" />
                  <option value="แผนกวิศวกรรมไฟฟ้า (Electrical)" />
                  <option value="แผนกคลังสินค้าและโลจิสติกส์" />
                  <option value="แผนกอาคารสถานที่ (Facilities)" />
                  <option value="ฝ่ายยานพาหนะและเครื่องจักรกล" />
                </datalist>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เลขที่ใบสั่งงาน / วัตถุประสงค์การใช้
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={workOrderOrPurpose}
                  onChange={(e) => setWorkOrderOrPurpose(e.target.value)}
                  placeholder="เช่น WO-4012, ซ่อมสายพานเบอร์ 2"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น อะไหล่เดิมเสียหายจากการใช้งาน, ขอเบิกฉุกเฉินกะดึก"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!currentPart || currentPart.quantity <= 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ยืนยันการเบิกสินค้า (หักสต๊อกอัตโนมัติ)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Requisition Log & Report Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>รายงานผู้เบิกและจำนวนที่ใช้ (Requisition Report & Log)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {filteredRequisitions.length} รายการ
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              ประวัติการเบิกอะไหล่ทั้งหมด ระบุชื่อผู้เบิก วันเวลา และจำนวนที่ใช้
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportReportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
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
              placeholder="ค้นหาชื่อผู้เบิก, ชื่ออะไหล่, เลขที่ใบงาน..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">ทุกแผนก</option>
            <option value="ซ่อมบำรุง">แผนกซ่อมบำรุง</option>
            <option value="ผลิต">แผนกผลิต</option>
            <option value="ไฟฟ้า">แผนกไฟฟ้า</option>
            <option value="คลังสินค้า">คลังสินค้า</option>
            <option value="อาคาร">ฝ่ายอาคาร</option>
          </select>
        </div>

        {/* Requisition Table */}
        <div className="overflow-x-auto pt-1">
          {filteredRequisitions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่พบประวัติการเบิกสินค้าตามคำค้นหา
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">วันเวลา</th>
                  <th className="py-2.5 px-3">ชื่อผู้เบิก / แผนก</th>
                  <th className="py-2.5 px-3">อะไหล่ที่เบิก</th>
                  <th className="py-2.5 px-3 text-center">จำนวนที่ใช้</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">ใบสั่งงาน / วัตถุประสงค์</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">สถานะ</th>
                  {userRole === 'admin' && <th className="py-2.5 px-3 text-right">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequisitions.map((record) => {
                  const isReturned = record.status === 'returned';
                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isReturned ? 'opacity-60 bg-slate-50/50 line-through' : ''
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        <div className="font-medium text-slate-800">
                          {new Date(record.timestamp).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(record.timestamp).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Requester & Department */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-tight">
                          {record.requesterName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{record.department}</div>
                      </td>

                      {/* Part Name & Code with equipment thumbnail */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const matchedPart = parts.find((p) => p.id === record.partId);
                            if (matchedPart?.imageUrl) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImagePart(matchedPart)}
                                  className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 hover:border-amber-500 hover:shadow-xs transition cursor-pointer"
                                  title="คลิกดูรูปภาพอุปกรณ์"
                                >
                                  <img
                                    src={matchedPart.imageUrl}
                                    alt={record.partName}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <div>
                            <div className="font-medium text-slate-900 leading-snug">{record.partName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {record.partId} | {record.barcode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 font-mono text-sm bg-slate-100 px-2 py-0.5 rounded-md">
                          {record.quantity} {record.unit}
                        </span>
                      </td>

                      {/* Work Order */}
                      <td className="py-3 px-3 hidden md:table-cell text-slate-600">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {record.workOrderOrPurpose}
                        </div>
                        {record.notes && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            หมายเหตุ: {record.notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        {isReturned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                            คืนสต๊อกแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            เบิกเรียบร้อย
                          </span>
                        )}
                      </td>

                      {/* Admin actions: Return to stock */}
                      {userRole === 'admin' && (
                        <td className="py-3 px-3 text-right">
                          {!isReturned && (
                            <button
                              onClick={() => setVoidConfirmRecord(record)}
                              className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-[11px] font-medium flex items-center gap-1 ml-auto"
                              title="ยกเลิกการเบิก และคืนจำนวนอะไหล่กลับเข้าสต๊อก"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>คืนสต๊อก</span>
                            </button>
                          )}
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

      {/* Modal: Void / Return Requisition confirmation */}
      {voidConfirmRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">ยืนยันการคืนอะไหล่เข้าสต๊อก?</h4>
                <p className="text-xs text-slate-500">
                  ระบบจะบวกสต๊อกอะไหล่กลับเข้าไป {voidConfirmRecord.quantity} {voidConfirmRecord.unit}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{voidConfirmRecord.partName}</div>
              <div className="mt-1 text-slate-500">
                ผู้เบิกเดิม: <strong>{voidConfirmRecord.requesterName}</strong> | จำนวน: <strong>{voidConfirmRecord.quantity} {voidConfirmRecord.unit}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVoidConfirmRecord(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onVoidRequisition(voidConfirmRecord.id);
                  setVoidConfirmRecord(null);
                }}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition shadow-xs"
              >
                ยืนยันคืนสต๊อก
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
