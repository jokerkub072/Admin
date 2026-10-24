import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Boxes,
  DollarSign,
  AlertTriangle,
  PackageX,
  TrendingDown,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Building2,
  ExternalLink,
  RotateCw,
  Image as ImageIcon,
} from 'lucide-react';
import { PartItem, RequisitionRecord, SheetsSyncState } from '../types/inventory';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface ReportViewProps {
  parts: PartItem[];
  requisitions: RequisitionRecord[];
  syncState: SheetsSyncState;
  onOpenSheetsModal: () => void;
  onTriggerSync: () => Promise<void>;
}

export const ReportView: React.FC<ReportViewProps> = ({
  parts,
  requisitions,
  syncState,
  onOpenSheetsModal,
  onTriggerSync,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewImagePart, setPreviewImagePart] = useState<PartItem | null>(null);

  // High-level KPI calculations
  const totalItemCount = parts.length;
  const totalQuantity = parts.reduce((acc, p) => acc + p.quantity, 0);
  const totalValuation = parts.reduce((acc, p) => acc + p.quantity * p.unitPrice, 0);
  const outOfStockCount = parts.filter((p) => p.quantity <= 0).length;
  const lowStockCount = parts.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold).length;

  // Breakdown by Category
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; quantity: number; valuation: number }>();
    parts.forEach((p) => {
      const cat = p.category || 'อื่นๆ';
      const existing = map.get(cat) || { count: 0, quantity: 0, valuation: 0 };
      map.set(cat, {
        count: existing.count + 1,
        quantity: existing.quantity + p.quantity,
        valuation: existing.valuation + p.quantity * p.unitPrice,
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].valuation - a[1].valuation);
  }, [parts]);

  // Top Requisitioned Parts
  const topRequisitionedParts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; unit: string }>();
    requisitions
      .filter((r) => r.status === 'completed')
      .forEach((r) => {
        const existing = map.get(r.partId) || { name: r.partName, quantity: 0, unit: r.unit };
        map.set(r.partId, {
          name: r.partName,
          quantity: existing.quantity + r.quantity,
          unit: r.unit,
        });
      });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [requisitions]);

  // Top Requesters
  const topRequesters = useMemo(() => {
    const map = new Map<string, { count: number; department: string }>();
    requisitions
      .filter((r) => r.status === 'completed')
      .forEach((r) => {
        const existing = map.get(r.requesterName) || { count: 0, department: r.department };
        map.set(r.requesterName, {
          count: existing.count + 1,
          department: r.department,
        });
      });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [requisitions]);

  // Filtered Parts for Detail Table (sorted naturally by code from least to greatest EE01-01, EE01-02, ...)
  const filteredParts = useMemo(() => {
    return parts
      .filter((p) => {
        const q = searchTerm.toLowerCase().trim();
        const matchSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q);

        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;

        let matchStatus = true;
        if (statusFilter === 'out') matchStatus = p.quantity <= 0;
        else if (statusFilter === 'low') matchStatus = p.quantity > 0 && p.quantity <= p.minThreshold;
        else if (statusFilter === 'normal') matchStatus = p.quantity > p.minThreshold;

        return matchSearch && matchCat && matchStatus;
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [parts, searchTerm, categoryFilter, statusFilter]);

  const exportBalanceReportCSV = () => {
    const headers = [
      'รหัสอะไหล่',
      'บาร์โค้ด',
      'ชื่ออะไหล่',
      'หมวดหมู่',
      'ตำแหน่งจัดเก็บ',
      'จำนวนคงเหลือ',
      'จุดสั่งซื้อขั้นต่ำ',
      'หน่วยนับ',
      'ราคาต่อหน่วย(บาท)',
      'มูลค่าคงเหลือรวม(บาท)',
      'สถานะ',
    ];
    const rows = filteredParts.map((p) => {
      const statusText =
        p.quantity <= 0 ? 'หมดสต๊อก' : p.quantity <= p.minThreshold ? 'ใกล้หมด' : 'ปกติ';
      return [
        p.id,
        p.barcode,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.location}"`,
        p.quantity,
        p.minThreshold,
        p.unit,
        p.unitPrice,
        p.quantity * p.unitPrice,
        statusText,
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานอะไหล่คงเหลือ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync();
      alert('ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อย!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`ซิงค์ไม่สำเร็จ: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base sm:text-lg">รายงานอะไหล่คงเหลือ & สรุปภาพรวมคลัง</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            ข้อมูลสต๊อกคงเหลือแบบเรียลไทม์ พร้อมการวิเคราะห์การเบิกใช้งานและการประเมินมูลค่า
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>

          <button
            onClick={exportBalanceReportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          {syncState.spreadsheetId ? (
            <div className="flex items-center gap-1.5">
              <a
                href={syncState.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${syncState.spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>ดูใน Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-xl transition"
                title="ซิงค์ข้อมูลลง Sheets เดี๋ยวนี้"
              >
                <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenSheetsModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>เชื่อมต่อ Google Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Items */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>รายการอะไหล่</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {totalItemCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ชนิดอะไหล่ทั้งหมดในระบบ</div>
        </div>

        {/* Total Quantity */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>จำนวนคงเหลือรวม</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-blue-700">
            {totalQuantity.toLocaleString('th-TH')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ชิ้น/หน่วย ในคลัง</div>
        </div>

        {/* Total Valuation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>มูลค่าสต๊อกรวม</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-emerald-800">
            ฿{totalValuation.toLocaleString('th-TH')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">คำนวณตามราคาต่อหน่วย</div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-rose-600 flex items-center justify-between">
            <span>หมดสต๊อก (0 ชิ้น)</span>
            <PackageX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-rose-600">
            {outOfStockCount}
          </div>
          <div className="text-[11px] text-rose-500 mt-0.5">ต้องสั่งซื้อด่วน</div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-amber-600 flex items-center justify-between">
            <span>ใกล้หมดสต๊อก</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-amber-700">
            {lowStockCount}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">ต่ำกว่าจุดสั่งซื้อขั้นต่ำ</div>
        </div>
      </div>

      {/* Two Column Analysis: Top Requisitioned & Top Requesters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Requisitioned Parts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span>5 อะไหล่ที่มีการเบิกใช้สูงสุด (Top Parts Used)</span>
            </h4>
            <span className="text-[11px] text-slate-400">จากประวัติการเบิก</span>
          </div>

          {topRequisitionedParts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">ยังไม่มีข้อมูลการเบิกจ่าย</div>
          ) : (
            <div className="space-y-2">
              {topRequisitionedParts.map((item, index) => {
                const maxQty = topRequisitionedParts[0]?.quantity || 1;
                const percentage = Math.round((item.quantity / maxQty) * 100);

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium text-slate-800 truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Requesters (ผู้เบิกใช้งานสูงสุด) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" />
              <span>ผู้เบิกใช้งานมากที่สุด (Top Requesters)</span>
            </h4>
            <span className="text-[11px] text-slate-400">ตามจำนวนครั้ง</span>
          </div>

          {topRequesters.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">ยังไม่มีประวัติผู้เบิก</div>
          ) : (
            <div className="space-y-2">
              {topRequesters.map((req, idx) => (
                <div
                  key={req.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 leading-tight">{req.name}</div>
                      <div className="text-[11px] text-slate-500">{req.department}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900">{req.count}</span>
                    <span className="text-[10px] text-slate-500 ml-1">ครั้ง</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Valuation Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
          การกระจายมูลค่าและจำนวนตามหมวดหมู่อะไหล่
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {categoryStats.map(([cat, stats]) => (
            <div key={cat} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="font-semibold text-slate-800 truncate mb-1">{cat}</div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>จำนวนชนิด: <strong>{stats.count} รายการ</strong></span>
                <span>คงเหลือ: <strong>{stats.quantity} ชิ้น</strong></span>
              </div>
              <div className="mt-1 text-emerald-800 font-bold font-mono text-xs">
                มูลค่า ฿{stats.valuation.toLocaleString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Balance Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              ตารางรายงานอะไหล่คงเหลือแบบละเอียด (Inventory Balance Sheet)
            </h4>
            <p className="text-xs text-slate-500">
              แสดงยอดคงเหลือ จุดสั่งซื้อขั้นต่ำ ตำแหน่งจัดเก็บ และสถานะของอะไหล่ทุกรายการ
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่ออะไหล่, รหัส, บาร์โค้ด, ล็อกจัดเก็บ..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'low' | 'out' | 'normal')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="out">เฉพาะหมดสต๊อก ({outOfStockCount})</option>
            <option value="low">เฉพาะใกล้หมด ({lowStockCount})</option>
            <option value="normal">เฉพาะสถานะปกติ</option>
          </select>
        </div>

        {/* Printable Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 w-12 text-center">รูปตัวอย่าง</th>
                <th className="py-2.5 px-3">
                  <span className="flex items-center gap-1">
                    <span>รหัสอะไหล่</span>
                    <span className="text-[10px] text-amber-700 font-normal">(น้อยไปมาก)</span>
                  </span>
                </th>
                <th className="py-2.5 px-3">ชื่ออะไหล่</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">หมวดหมู่</th>
                <th className="py-2.5 px-3">ตำแหน่ง</th>
                <th className="py-2.5 px-3 text-right">คงเหลือ</th>
                <th className="py-2.5 px-3 text-right">จุดเตือน</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">ราคา/หน่วย</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">มูลค่ารวม</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((part) => {
                const isOut = part.quantity <= 0;
                const isLow = !isOut && part.quantity <= part.minThreshold;

                return (
                  <tr key={part.id} className="hover:bg-slate-50/80 transition">
                    {/* Equipment Preview Image */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setPreviewImagePart(part)}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-amber-500 hover:shadow-xs transition inline-flex items-center justify-center cursor-pointer group"
                        title="คลิกดูรูปภาพตัวอย่างอุปกรณ์"
                      >
                        {part.imageUrl ? (
                          <img
                            src={part.imageUrl}
                            alt={part.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400 opacity-60" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      <div className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded inline-block border border-slate-200 text-xs">
                        {part.id}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{part.barcode}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 leading-snug">{part.name}</div>
                    </td>

                    <td className="py-2.5 px-3 hidden sm:table-cell text-slate-600">
                      {part.category}
                    </td>

                    <td className="py-2.5 px-3 text-amber-800 font-medium font-mono text-[11px]">
                      {part.location}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {part.quantity} {part.unit}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {part.minThreshold} {part.unit}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 hidden md:table-cell">
                      ฿{part.unitPrice.toLocaleString('th-TH')}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800 hidden lg:table-cell">
                      ฿{(part.quantity * part.unitPrice).toLocaleString('th-TH')}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          หมดสต๊อก
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                          ปกติ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Lightbox Modal */}
      <ImagePreviewModal
        part={previewImagePart}
        onClose={() => setPreviewImagePart(null)}
      />
    </div>
  );
};
