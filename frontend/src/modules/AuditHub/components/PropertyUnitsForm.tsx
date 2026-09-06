import React from 'react';
import { Building2, ChevronRight, Plus, Trash2 } from 'lucide-react';

export interface PropertyUnitsFormProps {
  isUnitsCollapsed: boolean;
  setIsUnitsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isUnitsAvailable: boolean;
  setIsUnitsAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  propertyUnits: any[];
  setPropertyUnits: React.Dispatch<React.SetStateAction<any[]>>;
  finalRecord: any;
  setFinalRecord: React.Dispatch<React.SetStateAction<any>>;
  addPropertyUnit?: () => void;
  removePropertyUnit?: (id: string) => void;
  updatePropertyUnit?: (id: string, field: string, value: any, subField?: string) => void;
}

export const PropertyUnitsForm: React.FC<PropertyUnitsFormProps> = ({
  isUnitsCollapsed,
  setIsUnitsCollapsed,
  isUnitsAvailable,
  setIsUnitsAvailable,
  propertyUnits,
  setPropertyUnits,
  finalRecord,
  setFinalRecord,
  addPropertyUnit = () => {
    const newUnit = {
      id: `unit_${Date.now()}`,
      type: 'مطلب_تحفيظ',
      unregisteredData: {
        bookType: 'أملاك',
        bookNumber: '',
        count: '',
        page: '',
        date: '',
        authority: '',
        notes: ''
      },
      registeredData: {
        deedNumber: '',
        issueDate: '',
        registryOffice: '',
        applicationNumber: '',
        notes: ''
      }
    };
    setPropertyUnits((prev: any[]) => [...prev, newUnit]);
  },
  removePropertyUnit = (id: string) => {
    setPropertyUnits((prev: any[]) => prev.filter((unit: any) => unit.id !== id));
  },
  updatePropertyUnit = (id: string, field: string, value: any, subField?: string) => {
    setPropertyUnits((prev: any[]) => prev.map((unit: any) => {
      if (unit.id !== id) return unit;
      if (subField) {
        return {
          ...unit,
          [field]: {
            ...unit[field],
            [subField]: value
          }
        };
      }
      return {
        ...unit,
        [field]: value
      };
    }));
  }
}) => {
  return (
    <>
      {/* Level 3: Deed Reference System (Property Units) */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsUnitsCollapsed(!isUnitsCollapsed)}
                                        >
                                            <Building2 className={`w-4 h-4 transition-colors ${isUnitsCollapsed ? 'text-slate-400' : 'text-blue-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">مراجع سند الشهادة/العقد</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isUnitsCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-blue-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(true)}
                                                    className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isUnitsAvailable ? 'text-blue-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isUnitsAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isUnitsCollapsed && (
                                        !isUnitsAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء مراجع السند (هذه الخانة غير متوفرة لهذا العقد)</span>
                                            </div>
                                        ) : (
                                        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {propertyUnits.map((unit, idx) => {
                                            // Duplicate Check Logic
                                            const isDuplicate = propertyUnits.some((u, i) => i !== idx && (
                                                (u.type === 'unregistered' && unit.type === 'unregistered' && 
                                                 u.unregisteredData.bookNumber === unit.unregisteredData.bookNumber &&
                                                 u.unregisteredData.count === unit.unregisteredData.count &&
                                                 u.unregisteredData.page === unit.unregisteredData.page &&
                                                 u.unregisteredData.authority === unit.unregisteredData.authority) ||
                                                (u.type === 'registered' && unit.type === 'registered' &&
                                                 u.registeredData.deedNumber === unit.registeredData.deedNumber)
                                            ));

                                            return (
                                            <div key={unit.id} className={`p-4 bg-white rounded-xl border relative group transition-all ${isDuplicate ? 'border-red-300 shadow-red-100 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
                                                <div className="absolute top-3 left-3 flex gap-2">
                                                     <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded-full">Unit {idx + 1}</span>
                                                    <button 
                                                        onClick={() => removePropertyUnit(unit.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all"
                                                        title="Remove Unit"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                
                                                <div className="mb-4 pr-8">
                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-2">
                                                        <span>🔹 نوع السند (Deed Type)</span>
                                                        {isDuplicate && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 rounded-full animate-pulse">تكرار بيانات!</span>}
                                                    </label>
                                                    <select 
                                                        value={unit.type}
                                                        onChange={(e) => updatePropertyUnit(unit.id, 'type', e.target.value)}
                                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer font-bold text-slate-700"
                                                    >
                                                        <option value="unregistered">☐ سند غير محفظ (رسوم عدلية – غير محفظة)</option>
                                                        <option value="registered">☐ رسم عقاري محفظ (Land Title)</option>
                                                    </select>
                                                </div>

                                                {unit.type === 'unregistered' ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            <span className="text-xs font-bold text-emerald-700">حالة سند غير محفظ (رسوم عدلية)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع الدفتر</label>
                                                            <select 
                                                                value={unit.unregisteredData.bookType}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookType')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 bg-white outline-none"
                                                            >
                                                                <option value="أملاك">أملاك</option>
                                                                <option value="زواج">زواج</option>
                                                                <option value="تركات">تركات</option>
                                                                <option value="وصايا">وصايا</option>
                                                                <option value="كفالات">كفالات</option>
                                                                <option value="هبات">هبات</option>
                                                                <option value="أوقاف">أوقاف</option>
                                                                <option value="مختلفة">سجلات مختلفة</option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الدفتر</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.bookNumber}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookNumber')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">العدد</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.count}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'count')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">الصحيفة</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.page}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'page')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ التضمين</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.unregisteredData.date}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'date')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">جهة التوثيق</label>
                                                                <select 
                                                                    value={unit.unregisteredData.authority}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'authority')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="فاس">فاس</option>
                                                                    <option value="مراكش">مراكش</option>
                                                                    <option value="أكادير">أكادير</option>
                                                                    <option value="وجدة">وجدة</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <textarea 
                                                                placeholder="ملاحظات حول هذا السند..."
                                                                value={unit.unregisteredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            <span className="text-xs font-bold text-blue-700">حالة رسم عقاري محفظ (Registered)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الرسم العقاري</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Titre Foncier (e.g., 12345/R)"
                                                                value={unit.registeredData.deedNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'deedNumber')}
                                                                className="w-full text-sm p-2.5 rounded border border-blue-200 bg-blue-50/30 outline-none font-mono font-bold text-blue-900"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ الإصدار</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.registeredData.issueDate}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'issueDate')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">المحافظة العقارية</label>
                                                                <select 
                                                                    value={unit.registeredData.registryOffice}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'registryOffice')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="القنيطرة">القنيطرة</option>
                                                                    <option value="سطات">سطات</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم المطلب (اختياري)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="رقم مطلب التحفيظ..."
                                                                value={unit.registeredData.applicationNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'applicationNumber')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                            />
                                                        </div>

                                                         <div>
                                                            <textarea 
                                                                placeholder="ملاحظات عقارية..."
                                                                value={unit.registeredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                        
                                        <button 
                                            onClick={addPropertyUnit}
                                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-400 transition-all group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span>إضافة عقار / سند آخر (Add Property Unit)</span>
                                        </button>
                                    </div>
                                    )
                                    )}
                                </div>
    </>
  );
};
