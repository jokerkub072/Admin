import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  PackagePlus,
  Edit2,
  Trash2,
  Tag,
  MapPin,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  ArrowUpDown,
  Download,
  Barcode,
  Layers,
  ShieldAlert,
  ArrowRight,
  Database,
  RotateCcw,
  Image as ImageIcon,
  Camera,
  Upload,
} from 'lucide-react';
import { PartItem, UserRole } from '../types/inventory';
import { LowStockAlertBanner } from '../components/LowStockAlertBanner';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface InventoryManageViewProps {
  parts: PartItem[];
  userRole: UserRole;
  onAddPart: (part: Omit<PartItem, 'id' | 'updatedAt'>) => void;
  onUpdatePart: (part: PartItem) => void;
  onDeletePart: (partId: string) => void;
  onStockIn: (partId: string, quantity: number, supplierRef?: string, notes?: string) => void;
  onSelectRequisition: (part: PartItem) => void;
  onOpenLabelModal: (part: PartItem) => void;
  onOpenScannerForSearch: () => void;
  externalSearchBarcode?: string | null;
  onClearExternalBarcode?: () => void;
  onResetTo100Y?: () => void;
}

export const InventoryManageView: React.FC<InventoryManageViewProps> = ({
  parts,
  userRole,
  onAddPart,
  onUpdatePart,
  onDeletePart,
  onStockIn,
  onSelectRequisition,
  onOpenLabelModal,
  onOpenScannerForSearch,
  externalSearchBarcode,
  onClearExternalBarcode,
  onResetTo100Y,
}) => {
  const [searchTerm, setSearchTerm] = useState(externalSearchBarcode || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'quantity' | 'location' | 'updated'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [previewImagePart, setPreviewImagePart] = useState<PartItem | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartItem | null>(null);
  const [stockInPart, setStockInPart] = useState<PartItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PartItem | null>(null);

  // Sync external barcode search when scanner scanned a code
  React.useEffect(() => {
    if (externalSearchBarcode) {
      setSearchTerm(externalSearchBarcode);
      setStatusFilter('all');
      setSelectedCategory('all');
    }
  }, [externalSearchBarcode]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [parts]);

  // Filtered & sorted parts (Natural numerical ascending: EE01-01, EE01-02, ..., EE01-10)
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        // Search filter
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          part.name.toLowerCase().includes(q) ||
          part.barcode.toLowerCase().includes(q) ||
          part.id.toLowerCase().includes(q) ||
          part.location.toLowerCase().includes(q) ||
          part.category.toLowerCase().includes(q);

        // Category filter
        const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;

        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'out') {
          matchesStatus = part.quantity <= 0;
        } else if (statusFilter === 'low') {
          matchesStatus = part.quantity > 0 && part.quantity <= part.minThreshold;
        } else if (statusFilter === 'normal') {
          matchesStatus = part.quantity > part.minThreshold;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'code') {
          cmp = a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
        } else if (sortBy === 'name') {
          cmp = a.name.localeCompare(b.name, 'th');
        } else if (sortBy === 'quantity') {
          cmp = a.quantity - b.quantity;
        } else if (sortBy === 'location') {
          cmp = a.location.localeCompare(b.location);
        } else if (sortBy === 'updated') {
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [parts, searchTerm, selectedCategory, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'code' | 'name' | 'quantity' | 'location' | 'updated') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const exportCSV = () => {
    const headers = ['รหัสอะไหล่', 'บาร์โค้ด', 'ชื่ออะไหล่', 'หมวดหมู่', 'จำนวนคงเหลือ', 'จุดสั่งซื้อขั้นต่ำ', 'หน่วย', 'ตำแหน่งจัดเก็บ', 'ราคาต่อหน่วย(บาท)', 'หมายเหตุ'];
    const rows = filteredParts.map((p) => [
      p.id,
      p.barcode,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.quantity,
      p.minThreshold,
      p.unit,
      `"${p.location}"`,
      p.unitPrice,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `สต๊อกอะไหล่_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Low stock alert banner */}
      <LowStockAlertBanner
        parts={parts}
        onSelectFilter={(filter) => {
          setStatusFilter(filter);
        }}
        onOpenStockInModal={userRole === 'admin' ? (part) => setStockInPart(part) : undefined}
      />

      {/* Action Bar & Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box with integrated scan trigger */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่ออะไหล่, บาร์โค้ด, รหัส, ตำแหน่งชั้นวาง..."
              className="w-full pl-9 pr-24 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
            />
            {searchTerm ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  if (onClearExternalBarcode) onClearExternalBarcode();
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                ล้าง
              </button>
            ) : null}
            <button
              onClick={onOpenScannerForSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="สแกนบาร์โค้ดเพื่อค้นหา"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>สแกน</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>

            {userRole === 'admin' && onResetTo100Y && (
              <button
                onClick={() => {
                  if (window.confirm('ต้องการโหลดฐานข้อมูลอะไหล่ Master Store 100 ปี (373 รายการ) ตามไฟล์ต้นฉบับหรือไม่?')) {
                    onResetTo100Y();
                  }
                }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                title="โหลดฐานข้อมูลเดิม Master Store 100Y (373 รายการ)"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">โหลด Master 100Y</span>
              </button>
            )}

            {userRole === 'admin' ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอะไหล่ใหม่</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium flex items-center gap-1">
                <span>โหมดพนักงาน (ดูสต๊อก & ขอเบิก)</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Filter className="w-3 h-3" />
            <span>สถานะ:</span>
          </div>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({parts.length})
          </button>
          <button
            onClick={() => setStatusFilter('low')}
            className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
              statusFilter === 'low'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>ใกล้หมด ({parts.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold).length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('out')}
            className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
              statusFilter === 'out'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <PackageX className="w-3 h-3 text-rose-600" />
            <span>หมดสต๊อก ({parts.filter((p) => p.quantity <= 0).length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('normal')}
            className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
              statusFilter === 'normal'
                ? 'bg-emerald-700 text-white font-bold'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ปกติ ({parts.filter((p) => p.quantity > p.minThreshold).length})</span>
          </button>

          {/* Sorting Pill */}
          <button
            onClick={() => toggleSort('code')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              sortBy === 'code'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="เรียงลำดับรหัสอะไหล่จากน้อยไปมาก (เช่น EE01-01, EE01-02...)"
          >
            <ArrowUpDown className="w-3 h-3 text-amber-600" />
            <span>เรียงรหัส: {sortBy === 'code' ? (sortOrder === 'asc' ? 'น้อยไปมาก (EE01-01...)' : 'มากไปน้อย') : 'ตามรหัส'}</span>
          </button>

          {/* Category Dropdown */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parts Table / Card View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <PackageX className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-700 text-sm">ไม่พบรายการอะไหล่ตามเงื่อนไข</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองสถานะ/หมวดหมู่เพื่อดูอะไหล่ทั้งหมด
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="mt-3 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 w-14 text-center">รูปตัวอย่าง</th>
                  <th className="py-3 px-3">
                    <button
                      onClick={() => toggleSort('code')}
                      className={`flex items-center gap-1 transition ${
                        sortBy === 'code' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                      }`}
                      title="คลิกเพื่อเรียงรหัสอะไหล่ (น้อยไปมาก / มากไปน้อย)"
                    >
                      <span>รหัสอะไหล่</span>
                      <ArrowUpDown className="w-3 h-3 text-amber-600" />
                      {sortBy === 'code' && (
                        <span className="text-[10px] text-amber-700">({sortOrder === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'})</span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">
                    <button
                      onClick={() => toggleSort('name')}
                      className={`flex items-center gap-1 transition ${
                        sortBy === 'name' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                      }`}
                    >
                      <span>ชื่อรายการอุปกรณ์</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 hidden sm:table-cell">หมวดหมู่</th>
                  <th className="py-3 px-3">
                    <button
                      onClick={() => toggleSort('quantity')}
                      className={`flex items-center gap-1 transition ${
                        sortBy === 'quantity' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                      }`}
                    >
                      <span>คงเหลือ / จุดเตือน</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 hidden md:table-cell">
                    <button
                      onClick={() => toggleSort('location')}
                      className={`flex items-center gap-1 transition ${
                        sortBy === 'location' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                      }`}
                    >
                      <span>ตำแหน่งจัดเก็บ</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.map((part) => {
                  const isOutOfStock = part.quantity <= 0;
                  const isLowStock = !isOutOfStock && part.quantity <= part.minThreshold;

                  return (
                    <tr
                      key={part.id}
                      className={`hover:bg-slate-50/70 transition group ${
                        isOutOfStock
                          ? 'bg-rose-50/30'
                          : isLowStock
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Equipment Image Thumbnail */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewImagePart(part)}
                          className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-amber-500 hover:shadow-md transition shrink-0 relative group flex items-center justify-center cursor-pointer mx-auto"
                          title="คลิกเพื่อดูรูปภาพตัวอย่างขนาดใหญ่"
                        >
                          {part.imageUrl ? (
                            <img
                              src={part.imageUrl}
                              alt={part.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400 opacity-60" />
                          )}
                        </button>
                      </td>

                      {/* Part Code & Barcode */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm bg-slate-100 px-2 py-1 rounded-lg inline-block border border-slate-200">
                          {part.id}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span>{part.barcode}</span>
                        </div>
                      </td>

                      {/* Part Name & Location */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug">
                          {part.name}
                        </div>
                        {/* Mobile visible category & location */}
                        <div className="sm:hidden mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="truncate">{part.category}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">{part.location}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 hidden sm:table-cell">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {part.category}
                        </span>
                      </td>

                      {/* Quantity & Stock Status badge */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-bold font-mono ${
                              isOutOfStock
                                ? 'text-rose-600'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {part.quantity}
                          </span>
                          <span className="text-slate-500 text-[11px]">{part.unit}</span>
                        </div>

                        {/* Status Label */}
                        <div className="mt-0.5">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <PackageX className="w-2.5 h-2.5" />
                              หมดสต๊อก
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              ใกล้หมด (เกณฑ์ {part.minThreshold})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              ปกติ (เกณฑ์ {part.minThreshold})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{part.location}</span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-3 hidden lg:table-cell font-mono text-slate-700">
                        ฿{part.unitPrice.toLocaleString('th-TH')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Requisition Button (Always available to Staff & Admin) */}
                          <button
                            onClick={() => onSelectRequisition(part)}
                            disabled={isOutOfStock}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
                            title="ไปหน้าเบิกสินค้าชิ้นนี้"
                          >
                            <span>เบิกของ</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {/* Print Barcode Label */}
                          <button
                            onClick={() => onOpenLabelModal(part)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="พิมพ์บาร์โค้ด"
                          >
                            <Tag className="w-4 h-4" />
                          </button>

                          {/* Admin Only Actions: Stock In, Edit, Delete */}
                          {userRole === 'admin' && (
                            <>
                              <button
                                onClick={() => setStockInPart(part)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                title="รับเข้าสต๊อก (+ Stock In)"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingPart(part)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                title="แก้ไขข้อมูลอะไหล่"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate(part)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="ลบอะไหล่"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Part (Admin) */}
      {isAddModalOpen && (
        <AddOrEditPartModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(data) => {
            onAddPart(data);
            setIsAddModalOpen(false);
          }}
          title="เพิ่มรายการอะไหล่ใหม่"
        />
      )}

      {/* Modal: Edit Part (Admin) */}
      {editingPart && (
        <AddOrEditPartModal
          isOpen={!!editingPart}
          initialData={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={(data) => {
            onUpdatePart({
              ...editingPart,
              ...data,
              updatedAt: new Date().toISOString(),
            });
            setEditingPart(null);
          }}
          title="แก้ไขข้อมูลอะไหล่"
        />
      )}

      {/* Modal: Stock In (Admin) */}
      {stockInPart && (
        <StockInModal
          part={stockInPart}
          onClose={() => setStockInPart(null)}
          onConfirm={(qty, supplierRef, notes) => {
            onStockIn(stockInPart.id, qty, supplierRef, notes);
            setStockInPart(null);
          }}
        />
      )}

      {/* Modal: Delete Confirmation (Admin) */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">ยืนยันการลบอะไหล่?</h4>
                <p className="text-xs text-slate-500">การกระทำนี้จะลบรายการออกจากระบบ</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{deleteCandidate.name}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                รหัส: {deleteCandidate.id} | บาร์โค้ด: {deleteCandidate.barcode} | คงเหลือ: {deleteCandidate.quantity} {deleteCandidate.unit}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDeletePart(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      <ImagePreviewModal
        part={previewImagePart}
        onClose={() => setPreviewImagePart(null)}
        onUpdateImage={(partId, newUrl) => {
          const target = parts.find((p) => p.id === partId);
          if (target) {
            const updated = {
              ...target,
              imageUrl: newUrl,
              updatedAt: new Date().toISOString(),
            };
            onUpdatePart(updated);
            setPreviewImagePart(updated);
          }
        }}
        onSelectRequisition={(p) => {
          setPreviewImagePart(null);
          onSelectRequisition(p);
        }}
        onOpenLabelModal={(p) => {
          setPreviewImagePart(null);
          onOpenLabelModal(p);
        }}
      />
    </div>
  );
};

// Sub-component: Add / Edit Part Modal
interface AddOrEditPartModalProps {
  isOpen: boolean;
  initialData?: PartItem;
  onClose: () => void;
  onSave: (data: Omit<PartItem, 'id' | 'updatedAt'>) => void;
  title: string;
}

const AddOrEditPartModal: React.FC<AddOrEditPartModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSave,
  title,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [barcode, setBarcode] = useState(
    initialData?.barcode || '885' + Math.floor(1000000000 + Math.random() * 9000000000)
  );
  const [category, setCategory] = useState(initialData?.category || 'ระบบส่งกำลังและลูกปืน');
  const [quantity, setQuantity] = useState(initialData?.quantity ?? 10);
  const [minThreshold, setMinThreshold] = useState(initialData?.minThreshold ?? 5);
  const [unit, setUnit] = useState(initialData?.unit || 'ชิ้น');
  const [location, setLocation] = useState(initialData?.location || 'A1-01');
  const [unitPrice, setUnitPrice] = useState(initialData?.unitPrice ?? 100);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) return;
    onSave({
      name: name.trim(),
      barcode: barcode.trim(),
      category: category.trim(),
      quantity: Number(quantity) || 0,
      minThreshold: Number(minThreshold) || 1,
      unit: unit.trim() || 'ชิ้น',
      location: location.trim() || 'ไม่ระบุ',
      unitPrice: Number(unitPrice) || 0,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ชื่ออะไหล่ / สเปก <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ลูกปืน Bearing 6205, ฟิวส์เซรามิก 10A"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รหัสบาร์โค้ด (Barcode) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="เช่น 8850029001015"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setBarcode('885' + Math.floor(1000000000 + Math.random() * 9000000000))}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] shrink-0 font-medium"
                  title="สุ่มบาร์โค้ดใหม่"
                >
                  สุ่ม
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่อะไหล่</label>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น ระบบส่งกำลัง, อุปกรณ์ไฟฟ้า"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="category-suggestions">
                <option value="ระบบส่งกำลังและลูกปืน" />
                <option value="อุปกรณ์ไฟฟ้าและควบคุม" />
                <option value="นิวเมติกส์และไฮดรอลิกส์" />
                <option value="ซีลและโอริง" />
                <option value="สกรูและตัวยึด" />
                <option value="สารหล่อลื่นและเคมีภัณฑ์" />
                <option value="อะไหล่เครื่องยนต์และยานพาหนะ" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                จำนวนคงเหลือปัจจุบัน <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                จุดสั่งซื้อขั้นต่ำ (เตือนใกล้หมด) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-amber-900 font-bold"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="เช่น ชิ้น, ตลับ, ตัว, ม้วน"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ตำแหน่งจัดเก็บ (ชั้น/ล็อก)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น A1-02 (ล็อก A ชั้น 1)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ราคาต่อหน่วย (บาท)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Equipment Photo / Image */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-700">
              รูปตัวอย่างอุปกรณ์ (Equipment Sample Photo)
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400 opacity-60" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="วาง Link URL รูปภาพอุปกรณ์ หรือกดถ่ายรูป"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-white"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>ถ่ายรูปด้วยกล้องมือถือ</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <label className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>เลือกรูปจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-medium px-1"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ขนาด เส้นผ่านศูนย์กลาง หรือเครื่องจักรที่นำไปใช้"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition shadow-xs"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: Stock In Modal (รับเข้าสต๊อก)
interface StockInModalProps {
  part: PartItem;
  onClose: () => void;
  onConfirm: (qty: number, supplierRef?: string, notes?: string) => void;
}

const StockInModal: React.FC<StockInModalProps> = ({ part, onClose, onConfirm }) => {
  const [qty, setQty] = useState(10);
  const [supplierRef, setSupplierRef] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) return;
    onConfirm(qty, supplierRef.trim(), notes.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-sm">รับอะไหล่เข้าสต๊อก (Stock In)</h3>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-sm leading-tight">{part.name}</div>
            <div className="flex items-center gap-3 mt-1.5 text-slate-600">
              <span>
                คงเหลือเดิม: <strong className="text-slate-900">{part.quantity} {part.unit}</strong>
              </span>
              <span>•</span>
              <span>
                หลังรับเข้า: <strong className="text-emerald-700 font-bold">{part.quantity + (Number(qty) || 0)} {part.unit}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              จำนวนที่รับเข้า ({part.unit}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-base font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ผู้จัดจำหน่าย / เลขที่ใบสั่งซื้อ (PO# / Supplier)
            </label>
            <input
              type="text"
              value={supplierRef}
              onChange={(e) => setSupplierRef(e.target.value)}
              placeholder="เช่น PO-2026-091, บจก. สยามแมชชีน"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">หมายเหตุการรับเข้า</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ตรวจรับครบถ้วน, สต๊อกสำรองเร่งด่วน"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-xs"
            >
              ยืนยันรับเข้าสต๊อก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
