import React from 'react';
import {
  Boxes,
  ClipboardList,
  BarChart3,
  QrCode,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  RotateCw,
} from 'lucide-react';
import { UserRole, SheetsSyncState } from '../types/inventory';

export type ActiveTab = 'inventory' | 'requisition' | 'report';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  onOpenScanner: () => void;
  onOpenSheetsModal: () => void;
  lowStockCount: number;
  syncState: SheetsSyncState;
  onQuickSync: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onOpenScanner,
  onOpenSheetsModal,
  lowStockCount,
  syncState,
  onQuickSync,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c1322] border-t border-slate-800/90 shadow-2xl backdrop-blur-md px-3 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        {/* Left Branding */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="leading-tight select-none">
            <div className="font-bold text-xs text-white tracking-tight flex items-center gap-1">
              <span>Master Store100Y</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">ระบบสต๊อกอะไหล่</div>
          </div>

          {/* Google Sheets Sync Quick Trigger Button */}
          <button
            onClick={onOpenSheetsModal}
            className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700/80 text-[11px] font-semibold transition"
          >
            <span>Google Sheets Sync</span>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. Inventory Manage */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 relative ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">จัดการสต๊อกสินค้า</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold shrink-0">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* 2. Requisition */}
          <button
            onClick={() => setActiveTab('requisition')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'requisition'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">เบิกสินค้า & ประวัติ</span>
          </button>

          {/* 3. Reports & Analytics (Active in screenshot) */}
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">รายงานอะไหล่คงเหลือ</span>
          </button>
        </div>

        {/* Right Tools: Barcode Scanner, Sheets Status, User Role */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Barcode Scanner Button */}
          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
            title="สแกนบาร์โค้ด"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline whitespace-nowrap">สแกนบาร์โค้ด</span>
          </button>

          {/* Google Sheets Pill Button */}
          <button
            onClick={onOpenSheetsModal}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border shrink-0 ${
              syncState.spreadsheetId
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/80'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline whitespace-nowrap">
              {syncState.spreadsheetId ? 'Google Sheets (เชื่อมต่อแล้ว)' : 'Google Sheets'}
            </span>
            {syncState.isSyncing && <RotateCw className="w-3 h-3 animate-spin text-amber-400" />}
          </button>

          {/* User Role Switcher Pill */}
          <button
            onClick={() => setUserRole(userRole === 'admin' ? 'staff' : 'admin')}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border shrink-0 ${
              userRole === 'admin'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
            }`}
            title={`คลิกเพื่อสลับสิทธิ์: ปัจจุบันคือ ${userRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงาน (Staff)'}`}
          >
            {userRole === 'admin' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline">แอดมิน</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span className="hidden lg:inline">พนักงาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};
