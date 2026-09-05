import React from 'react';
import { Database, X } from 'lucide-react';
import { HighResViewer } from './HighResViewer';
import type { FeesAgentState } from '../../../types/feesAgentTypes';

export interface VaultModalProps {
  isOpen: boolean;
  title: string;
  type: string;
  onClose: () => void;
  state: FeesAgentState;
  selectedViewerDoc: any;
  setSelectedViewerDoc: (doc: any) => void;
  viewerZoom: number;
  viewerPanOffset: { x: number; y: number };
  isDraggingViewer: boolean;
  handleViewerMouseDown: (e: React.MouseEvent) => void;
  handleViewerMouseMove: (e: React.MouseEvent) => void;
  handleViewerMouseUp: () => void;
  handleViewerWheel: (e: { deltaY: number; preventDefault?: () => void }) => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  title,
  type,
  onClose,
  state,
  selectedViewerDoc,
  setSelectedViewerDoc,
  viewerZoom,
  viewerPanOffset,
  isDraggingViewer,
  handleViewerMouseDown,
  handleViewerMouseMove,
  handleViewerMouseUp,
  handleViewerWheel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col border border-white/10">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">نظام معاينة الوثائق عالي الدقة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-l border-white/10 bg-slate-900/30 overflow-y-auto p-4" dir="rtl">
            {type === 'certificates' && (
              <div className="space-y-3">
                {(!state.certificates || state.certificates.length === 0) ? (
                  <p className="text-center text-slate-500 py-8">لا توجد شهادات</p>
                ) : (
                  state.certificates.map((cert: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => cert.file && setSelectedViewerDoc(cert.file)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedViewerDoc === cert.file
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="font-bold text-white mb-1">{cert.type}</div>
                      <div className="text-xs text-slate-400">رقم: {cert.number}</div>
                      {!cert.file && <div className="mt-2 text-[10px] text-amber-500/80">لم يتم إرفاق ملف</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {type === 'ids' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">الطرف الأول</h4>
                  <div className="space-y-2">
                    {state.sellers.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => p.idImage && setSelectedViewerDoc(p.idImage)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedViewerDoc === p.idImage
                            ? 'bg-indigo-600/20 border-indigo-500'
                            : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-white text-sm">{p.name || 'طرف غير مسمى'}</div>
                        <div className="text-[10px] text-slate-400">CIN: {p.idNumber || '---'}</div>
                        {!p.idImage && <div className="mt-2 text-[10px] text-red-400">لا توجد صورة</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">الطرف الثاني</h4>
                  <div className="space-y-2">
                    {state.buyers.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => p.idImage && setSelectedViewerDoc(p.idImage)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedViewerDoc === p.idImage
                            ? 'bg-emerald-600/20 border-emerald-500'
                            : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-white text-sm">{p.name || 'طرف غير مسمى'}</div>
                        <div className="text-[10px] text-slate-400">CIN: {p.idNumber || '---'}</div>
                        {!p.idImage && <div className="mt-2 text-[10px] text-red-400">لا توجد صورة</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Viewer Area */}
          <div className="flex-1 flex flex-col bg-slate-950 relative">
            <HighResViewer
              doc={selectedViewerDoc}
              zoom={viewerZoom}
              pan={viewerPanOffset}
              isDragging={isDraggingViewer}
              onMouseDown={handleViewerMouseDown}
              onMouseMove={handleViewerMouseMove}
              onMouseUp={handleViewerMouseUp}
              onWheel={handleViewerWheel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
