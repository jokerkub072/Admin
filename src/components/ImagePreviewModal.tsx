import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Tag,
  Camera,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  PackageX,
  ArrowRight,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { PartItem } from '../types/inventory';

interface ImagePreviewModalProps {
  part: PartItem | null;
  onClose: () => void;
  onUpdateImage?: (partId: string, newImageUrl: string) => void;
  onSelectRequisition?: (part: PartItem) => void;
  onOpenLabelModal?: (part: PartItem) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  part,
  onClose,
  onUpdateImage,
  onSelectRequisition,
  onOpenLabelModal,
}) => {
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!part) return null;

  const isOutOfStock = part.quantity <= 0;
  const isLowStock = !isOutOfStock && part.quantity <= part.minThreshold;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUpdateImage(part.id, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUrl = () => {
    if (urlInput.trim() && onUpdateImage) {
      onUpdateImage(part.id, urlInput.trim());
      setIsEditingUrl(false);
      setUrlInput('');
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(part.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] border border-slate-800/20">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-tight text-white">รูปตัวอย่างอุปกรณ์</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  {part.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{part.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Image Viewer Container */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[250px] max-h-[380px] p-4 group">
          {part.imageUrl ? (
            <img
              src={part.imageUrl}
              alt={part.name}
              className="max-h-[340px] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-3 text-slate-600">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-xs font-medium text-slate-400">ยังไม่มีรูปภาพตัวอย่างอุปกรณ์</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                แตะปุ่มด้านล่างเพื่อถ่ายภาพหรืออัปโหลดรูปภาพได้ทันที
              </p>
            </div>
          )}

          {/* Quick Upload Buttons Over Image */}
          {onUpdateImage && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition">
              {/* Smartphone Camera Capture */}
              <label className="p-2 bg-slate-900/90 hover:bg-amber-600 text-white rounded-xl shadow-md cursor-pointer transition flex items-center gap-1 text-[11px] font-medium backdrop-blur-xs">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">ถ่ายรูป</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Upload File */}
              <label className="p-2 bg-slate-900/90 hover:bg-amber-600 text-white rounded-xl shadow-md cursor-pointer transition flex items-center gap-1 text-[11px] font-medium backdrop-blur-xs">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">เลือกรูป</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Edit URL */}
              <button
                type="button"
                onClick={() => {
                  setUrlInput(part.imageUrl || '');
                  setIsEditingUrl(!isEditingUrl);
                }}
                className="p-2 bg-slate-900/90 hover:bg-amber-600 text-white rounded-xl shadow-md transition flex items-center gap-1 text-[11px] font-medium backdrop-blur-xs"
                title="ใส่ URL รูปภาพ"
              >
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">URL</span>
              </button>
            </div>
          )}
        </div>

        {/* URL Input Bar (Collapsible) */}
        {isEditingUrl && onUpdateImage && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex gap-2 items-center text-xs">
            <input
              type="url"
              placeholder="วาง URL รูปภาพ เช่น https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-800"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-2xs"
            >
              บันทึก
            </button>
            <button
              onClick={() => setIsEditingUrl(false)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl"
            >
              ยกเลิก
            </button>
          </div>
        )}

        {/* Info Body */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-mono font-bold text-slate-900 text-xs border border-slate-200">
                  {part.id}
                </span>
                <button
                  type="button"
                  onClick={copyCodeToClipboard}
                  className="p-1 text-slate-400 hover:text-slate-700 transition rounded"
                  title="คัดลอกรหัส"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Status Badge */}
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  <PackageX className="w-3 h-3" />
                  หมดสต๊อก (0 {part.unit})
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  ใกล้หมดสต๊อก ({part.quantity} {part.unit})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  สต๊อกปกติ ({part.quantity} {part.unit})
                </span>
              )}
            </div>

            <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">{part.name}</h4>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 text-[10px] block">หมวดหมู่อะไหล่:</span>
              <span className="font-medium text-slate-800">{part.category}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">ตำแหน่งจัดเก็บ:</span>
              <div className="flex items-center gap-1 font-semibold text-amber-800">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">{part.location}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">จำนวนคงเหลือ:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {part.quantity} {part.unit}
              </span>
              <span className="text-[10px] text-slate-500 ml-1.5">
                (จุดเตือน: {part.minThreshold})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">รหัสบาร์โค้ด:</span>
              <span className="font-mono text-slate-700 text-xs">{part.barcode}</span>
            </div>
          </div>

          {part.notes && (
            <div className="text-[11px] text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/70">
              <span className="font-semibold text-amber-900">หมายเหตุ: </span>
              {part.notes}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {part.imageUrl && (
              <a
                href={part.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                title="เปิดภาพในแท็บใหม่"
              >
                <span>ขนาดเต็ม</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {onOpenLabelModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLabelModal(part);
                }}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                title="พิมพ์สติ๊กเกอร์บาร์โค้ด"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">บาร์โค้ด</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSelectRequisition && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectRequisition(part);
                }}
                disabled={isOutOfStock}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
              >
                <span>เบิกอะไหล่นี้</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
