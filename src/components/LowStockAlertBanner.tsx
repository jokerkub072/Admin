import React from 'react';
import { AlertTriangle, AlertOctagon, ChevronRight, ArrowDownRight, PackageX } from 'lucide-react';
import { PartItem } from '../types/inventory';

interface LowStockAlertBannerProps {
  parts: PartItem[];
  onSelectFilter: (filter: 'all' | 'low' | 'out') => void;
  onOpenStockInModal?: (part: PartItem) => void;
}

export const LowStockAlertBanner: React.FC<LowStockAlertBannerProps> = ({
  parts,
  onSelectFilter,
  onOpenStockInModal,
}) => {
  const outOfStockParts = parts.filter((p) => p.quantity <= 0);
  const lowStockParts = parts.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold);

  const totalAlertCount = outOfStockParts.length + lowStockParts.length;

  if (totalAlertCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/80 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                แจ้งเตือนสต๊อกอะไหล่ใกล้หมด / วิกฤต!
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                รวม {totalAlertCount} รายการ
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              มีสินค้าหมดสต๊อก {outOfStockParts.length} รายการ และสินค้าต่ำกว่าเกณฑ์ขั้นต่ำ {lowStockParts.length} รายการ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {outOfStockParts.length > 0 && (
            <button
              onClick={() => onSelectFilter('out')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition flex items-center gap-1 shadow-sm"
            >
              <PackageX className="w-3.5 h-3.5" />
              ดูรายการที่หมด ({outOfStockParts.length})
            </button>
          )}
          <button
            onClick={() => onSelectFilter('low')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold transition flex items-center gap-1 shadow-sm"
          >
            <span>ดูสินค้าใกล้หมด</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini carousel / ticker for top urgent low stock items */}
      <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {[...outOfStockParts, ...lowStockParts].slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-white/80 backdrop-blur-xs rounded-xl p-2.5 border border-amber-200 flex items-center justify-between gap-2 text-xs"
          >
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{item.name}</div>
              <div className="text-[11px] text-slate-500">
                คงเหลือ: <span className={item.quantity === 0 ? 'text-rose-600 font-bold' : 'text-amber-700 font-bold'}>
                  {item.quantity} {item.unit}
                </span>{' '}
                (เกณฑ์ขั้นต่ำ: {item.minThreshold})
              </div>
            </div>
            {onOpenStockInModal && (
              <button
                onClick={() => onOpenStockInModal(item)}
                className="shrink-0 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-medium transition"
              >
                + เติมสต๊อก
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
