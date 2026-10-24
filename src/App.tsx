/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getLocalParts,
  saveLocalParts,
  getLocalRequisitions,
  saveLocalRequisitions,
  getLocalStockIn,
  saveLocalStockIn,
  getStoredUserRole,
  setStoredUserRole,
  getStoredUserName,
  setStoredUserName,
  getStoredSpreadsheetId,
  setStoredSpreadsheetId,
  resetTo100YMasterParts,
} from './services/storage';
import { PartItem, RequisitionRecord, StockInRecord, UserRole, SheetsSyncState } from './types/inventory';
import { Navigation, ActiveTab } from './components/Navigation';
import { InventoryManageView } from './views/InventoryManageView';
import { RequisitionView } from './views/RequisitionView';
import { ReportView } from './views/ReportView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { SheetsSettingsModal } from './components/SheetsSettingsModal';
import { initAuth, getAccessToken } from './services/auth';
import { syncAllToSheets, appendRequisitionToSheets, appendStockInToSheets } from './services/sheets';

export default function App() {
  // Navigation & Role
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [userRole, setUserRoleState] = useState<UserRole>(getStoredUserRole());
  const [currentUserName, setCurrentUserName] = useState<string>(getStoredUserName());

  // Master Data
  const [parts, setParts] = useState<PartItem[]>(() => getLocalParts());
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>(() => getLocalRequisitions());
  const [stockIns, setStockIns] = useState<StockInRecord[]>(() => getLocalStockIn());

  // Inter-tab selections
  const [selectedPartForRequisition, setSelectedPartForRequisition] = useState<PartItem | null>(null);
  const [externalSearchBarcode, setExternalSearchBarcode] = useState<string | null>(null);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerContext, setScannerContext] = useState<'general' | 'search' | 'requisition'>('general');
  const [labelPart, setLabelPart] = useState<PartItem | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Google Sheets sync state
  const initialSpreadsheetId = getStoredSpreadsheetId();
  const [syncState, setSyncState] = useState<SheetsSyncState>({
    isConnected: false,
    userEmail: null,
    spreadsheetId: initialSpreadsheetId,
    spreadsheetName: initialSpreadsheetId ? 'Google Sheets สต๊อกอะไหล่' : null,
    spreadsheetUrl: initialSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${initialSpreadsheetId}/edit`
      : null,
    lastSyncTime: null,
    isSyncing: false,
    autoSync: true,
    error: null,
  });

  // Save role changes to storage
  const handleSetRole = (role: UserRole) => {
    setUserRoleState(role);
    setStoredUserRole(role);
    const newName = role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงานเบิกจ่าย (Staff)';
    setCurrentUserName(newName);
    setStoredUserName(newName);
  };

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setSyncState((prev) => ({
          ...prev,
          isConnected: true,
          userEmail: user.email,
        }));
      },
      () => {
        setSyncState((prev) => ({
          ...prev,
          isConnected: false,
          userEmail: null,
        }));
      }
    );
    return () => unsubscribe();
  }, []);

  // Save changes to localStorage whenever parts / requisitions / stockIns change
  useEffect(() => {
    saveLocalParts(parts);
  }, [parts]);

  useEffect(() => {
    saveLocalRequisitions(requisitions);
  }, [requisitions]);

  useEffect(() => {
    saveLocalStockIn(stockIns);
  }, [stockIns]);

  useEffect(() => {
    setStoredSpreadsheetId(syncState.spreadsheetId);
  }, [syncState.spreadsheetId]);

  // Sync to Google Sheets
  const handleFullSync = useCallback(async () => {
    if (!syncState.spreadsheetId) return;
    const token = await getAccessToken();
    if (!token) return;

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      await syncAllToSheets(token, syncState.spreadsheetId, parts, requisitions, stockIns);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
      }));
    } catch (err: unknown) {
      console.error('Sheets sync error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setSyncState((prev) => ({ ...prev, isSyncing: false, error: msg }));
      throw err;
    }
  }, [syncState.spreadsheetId, parts, requisitions, stockIns]);

  // Count low-stock and out-of-stock items for badge notification
  const lowStockCount = parts.filter((p) => p.quantity <= p.minThreshold).length;

  // Add new part (Admin)
  const handleAddPart = (newPartData: Omit<PartItem, 'id' | 'updatedAt'>) => {
    const newId = `PART-${String(parts.length + 1).padStart(3, '0')}`;
    const newPart: PartItem = {
      ...newPartData,
      id: newId,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newPart, ...parts];
    setParts(updated);

    // Sync in background if connected
    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          syncAllToSheets(token, syncState.spreadsheetId, updated, requisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Update existing part (Admin)
  const handleUpdatePart = (updatedPart: PartItem) => {
    const updated = parts.map((p) => (p.id === updatedPart.id ? updatedPart : p));
    setParts(updated);

    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          syncAllToSheets(token, syncState.spreadsheetId, updated, requisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Delete part (Admin)
  const handleDeletePart = (partId: string) => {
    const updated = parts.filter((p) => p.id !== partId);
    setParts(updated);

    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          syncAllToSheets(token, syncState.spreadsheetId, updated, requisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Stock In (Admin)
  const handleStockIn = (
    partId: string,
    quantity: number,
    supplierRef?: string,
    notes?: string
  ) => {
    const target = parts.find((p) => p.id === partId);
    if (!target) return;

    const updatedParts = parts.map((p) =>
      p.id === partId
        ? { ...p, quantity: p.quantity + quantity, updatedAt: new Date().toISOString() }
        : p
    );
    setParts(updatedParts);

    const newRecord: StockInRecord = {
      id: `STK-IN-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      partId,
      partName: target.name,
      barcode: target.barcode,
      quantity,
      unit: target.unit,
      supplierOrRef: supplierRef,
      recordedBy: currentUserName,
      notes,
    };

    const updatedStockIns = [newRecord, ...stockIns];
    setStockIns(updatedStockIns);

    // Push to Google Sheets
    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          appendStockInToSheets(token, syncState.spreadsheetId, newRecord).catch(console.error);
          syncAllToSheets(token, syncState.spreadsheetId, updatedParts, requisitions, updatedStockIns).catch(console.error);
        }
      });
    }
  };

  // Submit Requisition (Staff & Admin)
  const handleRequisitionSubmit = (
    recordData: Omit<RequisitionRecord, 'id' | 'timestamp' | 'status'>
  ) => {
    const newRecordId = `REQ-${new Date().getFullYear()}-${String(requisitions.length + 1).padStart(3, '0')}`;
    const newRecord: RequisitionRecord = {
      ...recordData,
      id: newRecordId,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    // Deduct stock quantity
    const updatedParts = parts.map((p) =>
      p.id === recordData.partId
        ? { ...p, quantity: Math.max(0, p.quantity - recordData.quantity), updatedAt: new Date().toISOString() }
        : p
    );
    setParts(updatedParts);

    const updatedRequisitions = [newRecord, ...requisitions];
    setRequisitions(updatedRequisitions);

    // Real-time append to Google Sheets
    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          appendRequisitionToSheets(token, syncState.spreadsheetId, newRecord).catch(console.error);
          syncAllToSheets(token, syncState.spreadsheetId, updatedParts, updatedRequisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Void/Return Requisition (Admin)
  const handleVoidRequisition = (reqId: string) => {
    const record = requisitions.find((r) => r.id === reqId);
    if (!record || record.status === 'returned') return;

    // Restore stock
    const updatedParts = parts.map((p) =>
      p.id === record.partId
        ? { ...p, quantity: p.quantity + record.quantity, updatedAt: new Date().toISOString() }
        : p
    );
    setParts(updatedParts);

    const updatedRequisitions = requisitions.map((r) =>
      r.id === reqId ? { ...r, status: 'returned' as const } : r
    );
    setRequisitions(updatedRequisitions);

    // Sync to Sheets
    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          syncAllToSheets(token, syncState.spreadsheetId, updatedParts, updatedRequisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Switch to requisition tab with a part preselected
  const handleSelectRequisition = (part: PartItem) => {
    setSelectedPartForRequisition(part);
    setActiveTab('requisition');
  };

  // Reload pristine 100Y Masterfile database (373 items)
  const handleResetTo100Y = () => {
    const pristine = resetTo100YMasterParts();
    setParts(pristine);
    if (syncState.spreadsheetId) {
      getAccessToken().then((token) => {
        if (token && syncState.spreadsheetId) {
          syncAllToSheets(token, syncState.spreadsheetId, pristine, requisitions, stockIns).catch(console.error);
        }
      });
    }
  };

  // Handle Barcode Scan Result
  const handleBarcodeScanned = (scannedBarcode: string) => {
    const matchedPart = parts.find(
      (p) =>
        p.barcode.toLowerCase() === scannedBarcode.toLowerCase() ||
        p.id.toLowerCase() === scannedBarcode.toLowerCase()
    );

    if (scannerContext === 'requisition') {
      if (matchedPart) {
        setSelectedPartForRequisition(matchedPart);
      } else {
        alert(`ไม่พบข้อมูลอะไหล่ที่ตรงกับบาร์โค้ด "${scannedBarcode}" ในระบบ`);
      }
    } else if (scannerContext === 'search') {
      setExternalSearchBarcode(scannedBarcode);
      setActiveTab('inventory');
    } else {
      // General scan from header
      if (matchedPart) {
        // Offer action: Go to requisition or view
        setSelectedPartForRequisition(matchedPart);
        setActiveTab('requisition');
      } else {
        setExternalSearchBarcode(scannedBarcode);
        setActiveTab('inventory');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col pb-28 sm:pb-32">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={handleSetRole}
        onOpenScanner={() => {
          setScannerContext('general');
          setIsScannerOpen(true);
        }}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        lowStockCount={lowStockCount}
        syncState={syncState}
        onQuickSync={handleFullSync}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'inventory' && (
          <InventoryManageView
            parts={parts}
            userRole={userRole}
            onAddPart={handleAddPart}
            onUpdatePart={handleUpdatePart}
            onDeletePart={handleDeletePart}
            onStockIn={handleStockIn}
            onSelectRequisition={handleSelectRequisition}
            onOpenLabelModal={(part) => setLabelPart(part)}
            onOpenScannerForSearch={() => {
              setScannerContext('search');
              setIsScannerOpen(true);
            }}
            externalSearchBarcode={externalSearchBarcode}
            onClearExternalBarcode={() => setExternalSearchBarcode(null)}
            onResetTo100Y={handleResetTo100Y}
          />
        )}

        {activeTab === 'requisition' && (
          <RequisitionView
            parts={parts}
            requisitions={requisitions}
            userRole={userRole}
            currentUserName={currentUserName}
            onRequisitionSubmit={handleRequisitionSubmit}
            onVoidRequisition={handleVoidRequisition}
            onOpenScanner={() => {
              setScannerContext('requisition');
              setIsScannerOpen(true);
            }}
            selectedPartFromInventory={selectedPartForRequisition}
            onClearSelectedPart={() => setSelectedPartForRequisition(null)}
          />
        )}

        {activeTab === 'report' && (
          <ReportView
            parts={parts}
            requisitions={requisitions}
            syncState={syncState}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            onTriggerSync={handleFullSync}
          />
        )}
      </main>

      {/* Barcode Scanner Modal (Camera & Input) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          scannerContext === 'requisition'
            ? 'สแกนเพื่อเบิกอะไหล่ (Scan to Requisition)'
            : 'สแกนบาร์โค้ดอะไหล่ (Scan Barcode)'
        }
        presetBarcodes={parts.map((p) => ({ barcode: p.barcode, name: p.name }))}
      />

      {/* Printable Barcode Label Modal */}
      <BarcodeLabelModal part={labelPart} onClose={() => setLabelPart(null)} />

      {/* Google Sheets Sync Settings Modal */}
      <SheetsSettingsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        syncState={syncState}
        setSyncState={setSyncState}
        parts={parts}
        requisitions={requisitions}
        stockIns={stockIns}
        onTriggerSync={handleFullSync}
      />
    </div>
  );
}
