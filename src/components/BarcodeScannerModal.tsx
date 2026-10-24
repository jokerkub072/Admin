import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, Upload, Keyboard, CheckCircle2, AlertCircle } from 'lucide-react';
import { playSuccessBeep, playErrorBeep } from '../services/sound';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  presetBarcodes?: Array<{ barcode: string; name: string }>;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'สแกนบาร์โค้ดสินค้า (Scan Barcode)',
  presetBarcodes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'presets'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-barcode-scanner-view';

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.debug('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      await stopCamera();

      // Wait a tick for container element to mount
      await new Promise((r) => setTimeout(r, 150));
      const el = document.getElementById(scannerContainerId);
      if (!el) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame scan error is normal while searching
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.warn('Camera failed to start:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError('กรุณาอนุญาตให้ใช้งานกล้องบนเบราว์เซอร์ของคุณเพื่อสแกนบาร์โค้ด');
      } else {
        setCameraError('ไม่สามารถเปิดกล้องได้ อาจมีโปรแกรมอื่นกำลังใช้งาน หรืออุปกรณ์ไม่รองรับ');
      }
      setIsScanning(false);
    }
  };

  const handleSuccessfulScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    playSuccessBeep();
    onScan(cleanCode);
    onClose();
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.error('Torch toggle failed', e);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decoded = await html5QrCode.scanFile(file, true);
      handleSuccessfulScan(decoded);
    } catch {
      playErrorBeep();
      alert('ไม่พบบาร์โค้ดในภาพที่อัปโหลด กรุณาลองถ่ายภาพใหม่ที่มีแสงสว่างและโฟกัสชัดเจน');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessfulScan(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-400">สแกนจากกล้องมือถือ หรือระบุรหัสด้วยตนเอง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            เปิดกล้องสแกน
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'manual' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            พิมพ์รหัสบาร์โค้ด
          </button>
          {presetBarcodes.length > 0 && (
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'presets' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              เลือกรายการทดสอบ
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center">
              {/* Camera Stream Viewport */}
              <div className="relative w-full aspect-[4/3] max-h-72 bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Laser scan line overlay */}
                {isScanning && !cameraError && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-64 h-40 border-2 border-amber-400/80 rounded-xl relative shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                      {/* Corner marks */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                      {/* Red laser line */}
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse mt-18" />
                    </div>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-5 flex flex-col items-center justify-center text-center text-white">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <p className="text-sm font-medium mb-3">{cameraError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition"
                      >
                        ลองใหม่อีกครั้ง
                      </button>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition"
                      >
                        พิมพ์รหัสแทน
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between w-full mt-3 px-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFacingMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'}
                  </button>
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        torchOn ? 'bg-amber-500 text-slate-900 font-semibold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                      {torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
                    </button>
                  )}
                </div>

                {/* Photo upload fallback */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปบาร์โค้ด</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div id="file-scanner-temp" className="hidden" />

              <p className="text-xs text-slate-500 text-center mt-3">
                หันกล้องไปที่บาร์โค้ดหรือ QR Code สินค้า ระบบจะตรวจจับและบันทึกรหัสให้อัตโนมัติ
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 py-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ป้อนรหัสบาร์โค้ดหรือรหัสสินค้า (Barcode / Part ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="เช่น 8850029001015 หรือ PART-001"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-base"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  สามารถสแกนด้วยเครื่องอ่านบาร์โค้ด USB Handheld Scanner หรือพิมพ์ตรงนี้ได้ทันที
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  ยืนยันรหัส
                </button>
              </div>
            </form>
          )}

          {activeTab === 'presets' && presetBarcodes.length > 0 && (
            <div className="space-y-2 py-2">
              <p className="text-xs text-slate-500 mb-2">
                เลือกรายการตัวอย่างที่มีในระบบ เพื่อทดสอบเบิกจ่ายหรือจัดการสต๊อกได้ทันที:
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {presetBarcodes.map((item) => (
                  <button
                    key={item.barcode}
                    onClick={() => handleSuccessfulScan(item.barcode)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-900">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{item.barcode}</div>
                    </div>
                    <span className="text-xs text-amber-600 font-medium group-hover:translate-x-0.5 transition">
                      เลือก &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
