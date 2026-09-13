import React from 'react';
import { 
  Building, 
  MapPin, 
  Users, 
  ChevronRight, 
  CreditCard as CreditCardIcon, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Printer, 
  Medal as AwardIcon, 
  CheckCircle2, 
  Building2,
  ShieldCheck,
  UserCheck,
  FolderArchive,
  FileSignature,
  Share2
} from 'lucide-react';
import { PropertyUnitsForm } from './PropertyUnitsForm';

export interface InclusionDataFormProps {
  finalRecord: any;
  setFinalRecord: React.Dispatch<React.SetStateAction<any>>;
  isPartiesCollapsed: boolean;
  setIsPartiesCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isFinancialCollapsed: boolean;
  setIsFinancialCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isUnitsCollapsed: boolean;
  setIsUnitsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isUnitsAvailable: boolean;
  setIsUnitsAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  propertyUnits: any[];
  setPropertyUnits: React.Dispatch<React.SetStateAction<any[]>>;
  isSavingFinalRecord: boolean;
  handleSaveFinalRecord: () => void;
  deleteCurrentRasm: () => void;
  deleteSavedRasmMutation: any;
  rasmId: string | null;
  addPropertyUnit?: () => void;
  removePropertyUnit?: (id: string) => void;
  updatePropertyUnit?: (id: string, field: string, value: any, subField?: string) => void;
  addOptionalParty?: () => void;
  removeOptionalParty?: (partyId: string) => void;
  updateOptionalParty?: (partyId: string, field: 'name' | 'nationalId', value: string) => void;
  isFinancialAvailable?: boolean;
  setIsFinancialAvailable?: React.Dispatch<React.SetStateAction<boolean>>;
  setPreSaveReviewIntent?: (intent: 'save' | 'finalize' | 'signing') => void;
  setIsPreSaveReviewModalOpen?: (open: boolean) => void;
  shareSelectedDocument?: () => void;
  selectedDocumentUrl?: string | null;
  printSelectedDocument?: () => void;
}

export const InclusionDataForm: React.FC<InclusionDataFormProps> = ({
  finalRecord,
  setFinalRecord,
  isPartiesCollapsed,
  setIsPartiesCollapsed,
  isFinancialCollapsed,
  setIsFinancialCollapsed,
  isUnitsCollapsed,
  setIsUnitsCollapsed,
  isUnitsAvailable,
  setIsUnitsAvailable,
  propertyUnits,
  setPropertyUnits,
  isSavingFinalRecord,
  handleSaveFinalRecord,
  deleteCurrentRasm,
  deleteSavedRasmMutation,
  rasmId,
  addPropertyUnit,
  removePropertyUnit,
  updatePropertyUnit,
  addOptionalParty = () => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: [
        ...(prev.optionalParties || []),
        { id: `party_${Date.now()}`, name: '', nationalId: '' }
      ]
    }));
  },
  updateOptionalParty = (partyId: string, field: 'name' | 'nationalId', value: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (prev.optionalParties || []).map((party: any) => {
        if (party.id === partyId) {
          return { ...party, [field]: value };
        }
        return party;
      })
    }));
  },
  removeOptionalParty = (partyId: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (prev.optionalParties || []).filter((party: any) => party.id !== partyId)
    }));
  },
  isFinancialAvailable = true,
  setIsFinancialAvailable = () => {},
  setPreSaveReviewIntent = () => {},
  setIsPreSaveReviewModalOpen = () => {},
  shareSelectedDocument = () => {},
  selectedDocumentUrl = null,
  printSelectedDocument = () => {}
}) => {
  return (
    <div className="space-y-6 pb-20">
      {/* Level 1: Deed Identity */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    
                                    {/* New Added Fields from Requirements */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع الشهادة</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                checked={true} readOnly
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <input 
                                                type="text" 
                                                value={finalRecord.certificateType}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, certificateType: e.target.value}))}
                                                className="flex-1 text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="أدخل نوع الشهادة..."
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">جهة التوثيق (المكتب)</label>
                                        <select 
                                            value={finalRecord.authority}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, authority: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                        >
                                            <option value="الرباط">مكتب التوثيق - الرباط</option>
                                            <option value="الدار البيضاء">مكتب التوثيق - الدار البيضاء</option>
                                            <option value="طنجة">مكتب التوثيق - طنجة</option>
                                            <option value="مراكش">مكتب التوثيق - مراكش</option>
                                        </select>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-2.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                                            <h5 className="text-xs font-bold text-slate-700">سجل البيانات</h5>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1 text-center">رقم</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="#"
                                                    value={finalRecord.register}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, register: e.target.value}))}
                                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-bold text-center text-slate-800 transition-all font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1 text-center">الصحيفة</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="#"
                                                    value={finalRecord.page}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, page: e.target.value}))}
                                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-bold text-center text-slate-800 transition-all font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1 text-center">العدد</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="#"
                                                    value={finalRecord.count}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, count: e.target.value}))}
                                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-bold text-center text-slate-800 transition-all font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1 text-center">تاريخ التلقي</label>
                                                <input 
                                                    type="date" 
                                                    value={finalRecord.date}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, date: e.target.value}))}
                                                    className="w-full text-[10px] p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-medium text-slate-800 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Level 2: Parties Cards */}
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                                    <div className="mb-3.5 flex items-center justify-between gap-3">
                                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-slate-600" />
                                            <span>بيانات أطراف الشهادة / العقد</span>
                                        </h4>
                                        <button
                                          type="button"
                                          onClick={addOptionalParty}
                                          className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold transition-all flex items-center gap-1"
                                        >
                                          <Plus className="w-3 h-3" />
                                          إضافة طرف
                                        </button>
                                    </div>
                                    
                                    {/* الطرف الأول */}
                                    <div className="mb-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                                الطرف الأول
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="الاسم الكامل"
                                                    value={finalRecord.firstPartyName}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyName: e.target.value}))}
                                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none pr-8 text-slate-800 font-bold transition-all"
                                                />
                                                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="رقم البطاقة الوطنية (CNIE)"
                                                value={finalRecord.firstPartyId}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyId: e.target.value}))}
                                                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-mono text-left uppercase transition-all"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    {/* الطرف الثاني */}
                                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                                                الطرف الثاني
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="الاسم الكامل"
                                                    value={finalRecord.secondPartyName}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyName: e.target.value}))}
                                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none pr-8 text-slate-800 font-bold transition-all"
                                                />
                                                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="رقم البطاقة الوطنية (CNIE)"
                                                value={finalRecord.secondPartyId}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyId: e.target.value}))}
                                                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none font-mono text-left uppercase transition-all"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    {/* الأطراف الاختيارية */}
                                    {Array.isArray((finalRecord as any).optionalParties) && (finalRecord as any).optionalParties.length > 0 && (
                                      <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-100">
                                        {(finalRecord as any).optionalParties.map((party: any, index: number) => (
                                          <div key={party.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">طرف اختياري {index + 1}</span>
                                              <button
                                                type="button"
                                                onClick={() => removeOptionalParty(party.id)}
                                                className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                حذف
                                              </button>
                                            </div>
                                            <div className="space-y-2">
                                              <input
                                                type="text"
                                                placeholder="الاسم الكامل"
                                                value={party.name}
                                                onChange={(e) => updateOptionalParty(party.id, 'name', e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 font-bold text-slate-800"
                                              />
                                              <input
                                                type="text"
                                                placeholder="رقم البطاقة الوطنية (CNIE)"
                                                value={party.nationalId}
                                                onChange={(e) => updateOptionalParty(party.id, 'nationalId', e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left font-mono text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 uppercase"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </div>

      <PropertyUnitsForm
        isUnitsCollapsed={isUnitsCollapsed}
        setIsUnitsCollapsed={setIsUnitsCollapsed}
        isUnitsAvailable={isUnitsAvailable}
        setIsUnitsAvailable={setIsUnitsAvailable}
        propertyUnits={propertyUnits}
        setPropertyUnits={setPropertyUnits}
        finalRecord={finalRecord}
        setFinalRecord={setFinalRecord}
      />

      {/* Level 4: Fiscal/Stamp */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsFinancialCollapsed(!isFinancialCollapsed)}
                                        >
                                            <CreditCardIcon className={`w-4 h-4 transition-colors ${isFinancialCollapsed ? 'text-slate-400' : 'text-emerald-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">البيانات المالية (Financial Data)</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isFinancialCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-emerald-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(true)}
                                                    className="w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isFinancialAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isFinancialAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isFinancialCollapsed && (
                                        !isFinancialAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء البيانات المالية (غير متوفرة لهذا السند)</span>
                                            </div>
                                        ) : (
                                        <div className="grid grid-cols-2 gap-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">دفتر المشهر</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.deedBook}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, deedBook: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-100" // readonly look maybe?
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">أمر المطالبة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.taxOrder}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, taxOrder: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                    )
                                    )}
                                </div>

                                {/* Level 5: Notary Vital Data */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-4 text-sm">بيانات العدل(ة)</h4>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم العدل العاطف</label>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الرباعي"
                                            value={finalRecord.judgeName || ''}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, judgeName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-950 to-[#101828] p-4 shadow-[0_25px_60px_rgba(15,23,42,0.35)]">
                                  <div className="mb-4 flex items-center gap-3 text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                      <FolderArchive className="w-5 h-5 text-slate-200" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-black">إجراءات الوثيقة</div>
                                      <div className="text-[11px] font-bold text-slate-400">الإجراءات النهائية بعد استكمال جميع البيانات</div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreSaveReviewIntent('signing');
                                        setIsPreSaveReviewModalOpen(true);
                                      }}
                                      disabled={!rasmId}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black text-white transition-all flex items-center justify-center gap-2 border ${
                                        rasmId
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500/30 hover:brightness-110'
                                        : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'
                                      }`}
                                    >
                                      <FileSignature className="w-4 h-4" />
                                      رواق التوقيع العدلي
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void shareSelectedDocument()}
                                      disabled={!selectedDocumentUrl}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        selectedDocumentUrl
                                        ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                                        : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
                                      }`}
                                    >
                                      <Share2 className="w-4 h-4" />
                                      مشاركة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={printSelectedDocument}
                                      className="w-full rounded-xl px-4 py-3 text-sm font-black text-slate-100 bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700"
                                    >
                                      <Printer className="w-4 h-4" />
                                      طباعة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void deleteCurrentRasm()}
                                      disabled={!rasmId || deleteSavedRasmMutation.isPending}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        !rasmId || deleteSavedRasmMutation.isPending
                                        ? 'bg-red-950/40 text-red-300/50 border-red-900/40 cursor-not-allowed'
                                        : 'bg-red-950/80 text-red-300 border-red-900/60 hover:bg-red-900/80'
                                      }`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      حذف
                                    </button>
                                  </div>
                                </div>

    </div>
  );
};
