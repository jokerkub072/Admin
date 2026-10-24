import React, { useState } from 'react';
import { X, FileSpreadsheet, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, LogIn, LogOut, Link2 } from 'lucide-react';
import { SheetsSyncState } from '../types/inventory';
import { googleSignIn, logout, getAccessToken } from '../services/auth';
import { createInventorySpreadsheet, syncAllToSheets } from '../services/sheets';
import { PartItem, RequisitionRecord, StockInRecord } from '../types/inventory';

interface SheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: SheetsSyncState;
  setSyncState: React.Dispatch<React.SetStateAction<SheetsSyncState>>;
  parts: PartItem[];
  requisitions: RequisitionRecord[];
  stockIns: StockInRecord[];
  onTriggerSync: () => Promise<void>;
}

export const SheetsSettingsModal: React.FC<SheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  syncState,
  setSyncState,
  parts,
  requisitions,
  stockIns,
  onTriggerSync,
}) => {
  const [customIdInput, setCustomIdInput] = useState(syncState.spreadsheetId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setSyncState((prev) => ({
          ...prev,
          isConnected: true,
          userEmail: res.user.email,
        }));
        setMessage({ text: `เข้าสู่ระบบสำเร็จ: ${res.user.email}`, type: 'success' });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: `เข้าสู่ระบบไม่สำเร็จ: ${msg}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setSyncState((prev) => ({
      ...prev,
      isConnected: false,
      userEmail: null,
    }));
    setMessage({ text: 'ออกจากระบบ Google เรียบร้อย', type: 'success' });
  };

  const handleCreateNewSpreadsheet = async () => {
    const token = await getAccessToken();
    if (!token) {
      setMessage({ text: 'กรุณาเข้าสู่ระบบ Google ก่อนสร้างสเปรดชีต', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const created = await createInventorySpreadsheet(token);
      setSyncState((prev) => ({
        ...prev,
        spreadsheetId: created.spreadsheetId,
        spreadsheetName: created.title,
        spreadsheetUrl: created.spreadsheetUrl,
        lastSyncTime: new Date().toISOString(),
      }));

      // Immediately push current local data to newly created sheet
      await syncAllToSheets(token, created.spreadsheetId, parts, requisitions, stockIns);

      setMessage({
        text: `สร้าง Google Spreadsheet สำเร็จและซิงค์ข้อมูล ${parts.length} รายการเรียบร้อย!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: `ไม่สามารถสร้างสเปรดชีตได้: ${msg}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = customIdInput.trim();
    if (!cleanId) return;

    // If full URL was pasted, extract the ID
    let finalId = cleanId;
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      finalId = match[1];
    }

    const token = await getAccessToken();
    if (!token) {
      setMessage({ text: 'กรุณาเข้าสู่ระบบ Google ก่อนเชื่อมต่อ', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await syncAllToSheets(token, finalId, parts, requisitions, stockIns);
      setSyncState((prev) => ({
        ...prev,
        spreadsheetId: finalId,
        spreadsheetName: 'Google Sheets สต๊อกอะไหล่',
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${finalId}/edit`,
        lastSyncTime: new Date().toISOString(),
      }));
      setMessage({ text: 'เชื่อมต่อและซิงค์ข้อมูลกับสเปรดชีตสำเร็จ!', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: `เชื่อมต่อไม่สำเร็จ: ${msg}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">การเชื่อมต่อ Google Sheets</h3>
              <p className="text-xs text-emerald-100">เก็บข้อมูลสต๊อกในระบบ Cloud ของ Google เพื่อนำไปใช้ต่อในโปรแกรมอื่น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* 1. Account Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              1. บัญชี Google Account
            </div>
            {syncState.isConnected && syncState.userEmail ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {syncState.userEmail.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{syncState.userEmail}</div>
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      เชื่อมต่อสิทธิ์ Google Sheets และ Drive เรียบร้อย
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-700 font-medium">
                    ลงชื่อเข้าใช้ด้วยบัญชี Google เพื่ออนุญาตให้ระบบบันทึกและอ่านข้อมูลสเปรดชีต
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    (ข้อมูลของคุณจะถูกเก็บใน Google Drive ของคุณเองอย่างปลอดภัย)
                  </p>
                </div>
                {/* Official Material Google Sign-in button */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2.5 bg-white border border-slate-300 rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 shadow-xs transition shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Spreadsheet Target Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              2. สเปรดชีตปลายทาง (Google Spreadsheet)
            </div>

            {syncState.spreadsheetId ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950">
                      กำลังเชื่อมต่อกับสเปรดชีตนี้:
                    </span>
                  </div>
                  <a
                    href={syncState.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${syncState.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition shadow-xs"
                  >
                    <span>เปิดใน Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-xs font-mono text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200 break-all select-all">
                  ID: {syncState.spreadsheetId}
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1">
                  <span>
                    ซิงค์ล่าสุด:{' '}
                    {syncState.lastSyncTime
                      ? new Date(syncState.lastSyncTime).toLocaleTimeString('th-TH')
                      : 'ยังไม่เคยซิงค์'}
                  </span>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await onTriggerSync();
                        setMessage({ text: 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อย', type: 'success' });
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : String(e);
                        setMessage({ text: `ซิงค์ไม่สำเร็จ: ${m}`, type: 'error' });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    กดซิงค์ข้อมูลเดี๋ยวนี้
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  คุณยังไม่ได้ระบุสเปรดชีต สามารถกดสร้างใหม่ได้ทันที (ระบบจะสร้างแผ่นงาน 3 หน้าให้โดยอัตโนมัติ)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isLoading || !syncState.isConnected}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    + สร้าง Google Sheets สต๊อกอะไหล่ใหม่ทันที
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">หรือเชื่อมต่อด้วย ID แผ่นงานเดิม</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleConnectExisting} className="flex gap-2">
                  <input
                    type="text"
                    value={customIdInput}
                    onChange={(e) => setCustomIdInput(e.target.value)}
                    placeholder="วาง Spreadsheet ID หรือ Link Google Sheets"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !syncState.isConnected || !customIdInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    เชื่อมต่อ
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 3. Third-party integration benefit notes */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              💡 ข้อดีของการเก็บข้อมูลใน Google Sheets:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
              <li>ดึงข้อมูลเข้า <strong>Looker Studio / Power BI</strong> เพื่อทำแดชบอร์ดสรุปผลผู้บริหารได้ทันที</li>
              <li>เชื่อมต่อไปยังโปรแกรมบัญชี, ERP หรือ Zapier / Make เพื่อส่งแจ้งเตือนเข้า <strong>LINE Notify / Telegram</strong> เมื่อสินค้าใกล้หมด</li>
              <li>ส่งออกเป็นไฟล์ <strong>Excel (.xlsx)</strong> หรือ <strong>CSV</strong> ได้ทุกเวลา</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            ตกลง / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
