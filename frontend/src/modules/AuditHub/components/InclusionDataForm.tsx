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

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
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
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التقييد</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.registrationDate || finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, registrationDate: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200 my-4"></div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الرقم المسلسل (Reference)</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={finalRecord.serial}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, serial: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono pl-8"
                                                />
                                                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            </div>
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التوثيق</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, date: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">السجل</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.register}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, register: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الصحيفة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.page}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, page: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">العدد</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.count}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, count: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Level 2: Parties Smart Cards */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h4 className="font-bold text-slate-700 text-sm flex justify-between items-center">
                                            بيانات اطراف الشهادة/العقد
                                            <span className="mr-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Smart Verify Active</span>
                                        </h4>
                                        <button
                                          type="button"
                                          onClick={addOptionalParty}
                                          className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md transition-all hover:brightness-110"
                                        >
                                          + إضافة طرف اختياري
                                        </button>
                                    </div>
                                    
                                    <div className="mb-4 relative group">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">الطرف الأول (البائع)</span>
                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                             <div className="flex items-center gap-1 opacity-50">
                                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                                <span className="text-[10px] font-mono text-slate-400">BIO-SECURE</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الاسم الثلاثي"
                                                value={finalRecord.firstPartyName}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyName: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none pl-10"
                                            />
                                            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="الرقم القومي"
                                                    value={finalRecord.firstPartyId}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyId: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                    dir="ltr"
                                                />
                                                <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 98%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 my-4 border-dashed"></div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">الطرف الثاني (المشتري)</span>
                                                 <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الثلاثي"
                                            value={finalRecord.secondPartyName}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الرقم القومي"
                                                value={finalRecord.secondPartyId}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyId: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                dir="ltr"
                                            />
                                             <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 95%</div>
                                        </div>
                                    </div>

                                    {Array.isArray((finalRecord as any).optionalParties) && (finalRecord as any).optionalParties.length > 0 && (
                                      <>
                                        <div className="border-t border-slate-200 my-4 border-dashed"></div>
                                        <div className="space-y-3">
                                          {(finalRecord as any).optionalParties.map((party: any, index: number) => (
                                            <div key={party.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                              <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">طرف اختياري {index + 1}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => removeOptionalParty(party.id)}
                                                  className="text-[11px] font-black text-red-600 hover:text-red-700"
                                                >
                                                  حذف
                                                </button>
                                              </div>
                                              <input
                                                type="text"
                                                placeholder="الاسم الثلاثي"
                                                value={party.name}
                                                onChange={(e) => updateOptionalParty(party.id, 'name', e.target.value)}
                                                className="mb-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                              />
                                              <input
                                                type="text"
                                                placeholder="الرقم القومي"
                                                value={party.nationalId}
                                                onChange={(e) => updateOptionalParty(party.id, 'nationalId', e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 p-2.5 text-left font-mono text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                dir="ltr"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </>
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
