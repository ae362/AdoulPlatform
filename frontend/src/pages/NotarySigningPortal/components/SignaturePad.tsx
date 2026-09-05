import React, { useRef, useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  documentId: string;
  documentName: string;
  onSignatureCaptured: (signatureData: string) => void;
  onClose: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  documentId,
  documentName,
  onSignatureCaptured,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);

  // Initialize canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setSignatureEmpty(false);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setSignatureEmpty(true);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || signatureEmpty) return;

    const signatureData = canvas.toDataURL('image/png');
    onSignatureCaptured(signatureData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">توقيع رقمي</h2>
            <p className="text-sm text-slate-600 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-4">✍️ توقيع الوثيقة</h3>
            <p className="text-sm text-slate-600 mb-4">
              يرجى التوقيع أدناه. استخدم الماوس أو لوحة اللمس للتوقيع.
            </p>

            {/* Canvas */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-64 cursor-crosshair"
              />
            </div>

            {signatureEmpty && (
              <p className="text-xs text-slate-500 mt-2">لم يتم التوقيع بعد</p>
            )}
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-blue-900 mb-2">📋 معلومات التوقيع</h4>
            <ul className="text-sm text-blue-900 space-y-1">
              <li>✓ الوثيقة: {documentName}</li>
              <li>✓ معرف الوثيقة: {documentId.slice(0, 8)}</li>
              <li>✓ التاريخ: {new Date().toLocaleDateString('ar-SA')}</li>
              <li>✓ الوقت: {new Date().toLocaleTimeString('ar-SA')}</li>
            </ul>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-amber-900 mb-2">🔒 إخلاء المسؤولية</h4>
            <p className="text-sm text-amber-900">
              بتوقيعك على هذه الوثيقة، فإنك تصرح بقبول شروط التوقيع الرقمي والموافقة على إضفاء الطابع الرسمي على هذه الوثيقة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={handleClear}
            className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            مسح
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg font-bold hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={signatureEmpty}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            تأكيد التوقيع
          </button>
        </div>
      </div>
    </div>
  );
};
