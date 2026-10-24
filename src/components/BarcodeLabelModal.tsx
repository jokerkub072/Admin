import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Download, MapPin, Tag } from 'lucide-react';
import { PartItem } from '../types/inventory';

interface BarcodeLabelModalProps {
  part: PartItem | null;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ part, onClose }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (part && svgRef.current) {
      try {
        JsBarcode(svgRef.current, part.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          margin: 6,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.error('Error rendering barcode with JsBarcode:', err);
      }
    }
  }, [part]);

  if (!part) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm">พิมพ์สติกเกอร์บาร์โค้ด (Barcode Label)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Preview Area */}
        <div className="p-6 bg-slate-100 flex flex-col items-center justify-center">
          <div
            id="printable-barcode-label"
            className="w-full max-w-[340px] bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 shadow-sm text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {part.imageUrl && (
                <img
                  src={part.imageUrl}
                  alt={part.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
                {part.category}
              </span>
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1 leading-tight line-clamp-2">
              {part.name}
            </div>
            <div className="text-xs font-mono text-slate-600 mb-2">
              รหัสอะไหล่: <span className="font-semibold text-slate-900">{part.id}</span>
            </div>

            {/* Rendered Barcode SVG */}
            <div className="flex justify-center my-2 bg-white p-1 rounded">
              <svg ref={svgRef} className="max-w-full h-auto" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600 mt-2">
              <div className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>ตำแหน่ง: {part.location}</span>
              </div>
              <div className="font-semibold text-slate-800">
                หน่วย: {part.unit}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 text-center">
            เหมาะสำหรับนำไปติดหน้ากล่อง ชั้นวางสินค้า หรือถุงอะไหล่เพื่อสะดวกในการสแกน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            พิมพ์สติกเกอร์
          </button>
        </div>
      </div>
    </div>
  );
};
