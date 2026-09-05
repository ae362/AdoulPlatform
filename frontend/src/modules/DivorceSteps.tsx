import React from 'react';
import { FeesAgentState } from './FeesAgent';

interface StepProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
}

export const Step1_Divorce_JudicialDetails: React.FC<StepProps> = ({ state, setState }) => {
  const updateDivorceState = (updates: Partial<NonNullable<FeesAgentState['divorceCertification']>>) => {
    setState(prev => ({
      ...prev,
      divorceCertification: { ...prev.divorceCertification!, ...updates }
    }));
  };

  const divorceState = state.divorceCertification!;

  return (
    <div className="space-y-6">
      {/* New Reception Status Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-blue-600">⚙️</span>
          صيغة تقنية ذكية
        </h3>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">وضعية التلقي:</label>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${state.receptionStatus === 'joint' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="receptionStatus"
                value="joint"
                checked={state.receptionStatus === 'joint'}
                onChange={() => setState(prev => ({ ...prev, receptionStatus: 'joint' }))}
                className="w-5 h-5 text-blue-600"
              />
              <span className="font-medium">تلقي مشترك</span>
            </label>
            
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${state.receptionStatus === 'individual' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="receptionStatus"
                value="individual"
                checked={state.receptionStatus === 'individual'}
                onChange={() => setState(prev => ({ ...prev, receptionStatus: 'individual' }))}
                className="w-5 h-5 text-blue-600"
              />
              <span className="font-medium">تلقي منفرد بإشعار/إذن قانوني</span>
            </label>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800 space-y-2">
            <p>يُفعَّل هذا الخيار عند تعذر التلقي في آن واحد، وفقًا للقانون المنظم لخطة العدالة.</p>
            <div className="flex items-start gap-2 mt-2 font-medium">
              <span>⚠️</span>
              <p>تنبيه قانوني خفي (غير مباشر – مناسب للتطبيق): يخضع التلقي المنفرد لمقتضيات قانون خطة العدالة، ولا يُفعّل إلا عند استيفاء الإشعار أو الإذن اللازم.</p>
            </div>
          </div>

          {state.receptionStatus === 'individual' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
              <p className="text-sm font-medium text-gray-700 mb-4">
                في حالة الجواب تلقي منفرد، يرجى تحديد نوع الإشعار أو الإذن والجهة الصادرة عنه والمدينة/الاقليم
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">نوع الإشعار/الإذن</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={state.individualReceptionDetails?.noticeType || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      individualReceptionDetails: {
                        ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                        noticeType: e.target.value
                      }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">رقم الاشعار/الاذن</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={state.individualReceptionDetails?.noticeNumber || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      individualReceptionDetails: {
                        ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                        noticeNumber: e.target.value
                      }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">الجهة الصادرة عنه</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={state.individualReceptionDetails?.authority || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      individualReceptionDetails: {
                        ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                        authority: e.target.value
                      }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">المدينة/الاقليم</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={state.individualReceptionDetails?.city || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      individualReceptionDetails: {
                        ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                        city: e.target.value
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
        <h3 className="font-bold text-lg text-blue-900 mb-2">1. الإذن القضائي وطبيعة الحكم</h3>
        <p className="text-sm text-blue-800">أدخل تفاصيل الإذن القضائي بالطلاق الاتفاقي.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">هل يوجد إذن قضائي؟</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={divorceState.hasJudicialPermission === 'yes'}
                onChange={() => updateDivorceState({ hasJudicialPermission: 'yes' })}
                className="w-4 h-4 text-blue-600"
              />
              <span>نعم</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={divorceState.hasJudicialPermission === 'no'}
                onChange={() => updateDivorceState({ hasJudicialPermission: 'no' })}
                className="w-4 h-4 text-blue-600"
              />
              <span>لا</span>
            </label>
          </div>
        </div>

        {divorceState.hasJudicialPermission === 'yes' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">المحكمة المصدرة للإذن</label>
              <input
                type="text"
                value={divorceState.courtName || ''}
                onChange={(e) => updateDivorceState({ courtName: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="مثال: المحكمة الابتدائية بالرباط"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">رقم ملف الإذن</label>
              <input
                type="text"
                value={divorceState.judgmentNumber || ''}
                onChange={(e) => updateDivorceState({ judgmentNumber: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="مثال: 1234/2024"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">تاريخ الإذن</label>
              <input
                type="date"
                value={divorceState.judgmentDate || ''}
                onChange={(e) => updateDivorceState({ judgmentDate: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t">
        <label className="block text-sm font-medium text-gray-700">هل الحكم القضائي بالإذن بالإشهاد على الطلاق الاتفاقي مشمول بالصيغة التنفيذية؟</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={divorceState.isExecutive === 'yes'}
              onChange={() => updateDivorceState({ isExecutive: 'yes' })}
              className="w-4 h-4 text-blue-600"
            />
            <span>نعم</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={divorceState.isExecutive === 'no'}
              onChange={() => updateDivorceState({ isExecutive: 'no' })}
              className="w-4 h-4 text-blue-600"
            />
            <span>لا</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={divorceState.isExecutive === 'not_specified'}
              onChange={() => updateDivorceState({ isExecutive: 'not_specified' })}
              className="w-4 h-4 text-blue-600"
            />
            <span>غير منصوص عليها في الحكم</span>
          </label>
        </div>

        {/* Alerts based on selection */}
        {divorceState.isExecutive === 'yes' && (
          <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-500 text-xl">ℹ️</span>
              </div>
              <div className="mr-3">
                <p className="text-sm text-blue-700 font-bold">الحكم مشمول بالصيغة التنفيذية.</p>
                <p className="text-sm text-blue-600 mt-1">
                  وجود الصيغة التنفيذية لا يُشترط لصحة الإشهاد على الطلاق الاتفاقي، لكنه قد يُفيد لاحقًا في تنفيذ بعض الآثار الواردة بالحكم أمام الجهات المختصة.
                </p>
              </div>
            </div>
          </div>
        )}

        {divorceState.isExecutive === 'no' && (
          <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-500 text-xl">⚠️</span>
              </div>
              <div className="mr-3">
                <p className="text-sm text-yellow-800 font-bold">تنبيه قانوني مهم:</p>
                <p className="text-sm text-yellow-700 mt-1">
                  عدم اشتمال الحكم على الصيغة التنفيذية لا يمنع الإشهاد على الطلاق الاتفاقي، ما دام الحكم قد صدر صريحًا بالإذن بالإشهاد.
                  الإشهاد العدلي يقوم على حكم الإذن وليس على الصيغة التنفيذية، ما لم ينص الحكم صراحة على خلاف ذلك.
                </p>
              </div>
            </div>
          </div>
        )}

        {divorceState.isExecutive === 'not_specified' && (
          <div className="bg-orange-50 border-r-4 border-orange-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-orange-500 text-xl">⚠️</span>
              </div>
              <div className="mr-3">
                <p className="text-sm text-orange-800 font-bold">تنبيه توضيحي:</p>
                <p className="text-sm text-orange-700 mt-1">
                  سكوت الحكم عن الصيغة التنفيذية لا يؤثر على صحة الإشهاد بالطلاق الاتفاقي، طالما أن منطوق الحكم يتضمن الإذن بالإشهاد وفقًا لمقتضيات مدونة الأسرة.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Alert - Always Visible */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-gray-500 text-xl">📌</span>
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-800 font-bold">تنبيه عام:</p>
              <p className="text-sm text-gray-600 mt-1">
                الصيغة التنفيذية ليست شرطًا قانونيًا لإشهاد العدل على الطلاق الاتفاقي، لأن هذا الإشهاد يتم تنفيذًا لحكم الإذن الصادر عن قضاء الأسرة، وليس تنفيذًا جبريًا لحكم إلزامي.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Basis - Collapsible or Static */}
        <div className="mt-4 border-t pt-4">
          <details className="group">
            <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-sm text-gray-600 hover:text-gray-800">
              <span>⚖️ الأساس القانوني (للاعتماد والتوثيق)</span>
              <span className="transition group-open:rotate-180">
                <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </summary>
            <div className="text-gray-600 mt-3 group-open:animate-fadeIn text-sm space-y-3 bg-gray-50 p-3 rounded">
              <div>
                <p className="font-bold text-gray-700">🔹 مدونة الأسرة - المادة 118:</p>
                <p className="italic">«يُوقع الطلاق الاتفاقي بإذن من المحكمة، ويتم الإشهاد به لدى العدلين…»</p>
                <p className="text-xs mt-1 text-gray-500">↳ هذه المادة لم تشترط الصيغة التنفيذية، واكتفت بوجود حكم بالإذن.</p>
              </div>
              <div>
                <p className="font-bold text-gray-700">🔹 العمل القضائي وقضاء الأسرة:</p>
                <p>دليل قضاء الأسرة الصادر عن وزارة العدل يميّز بين حكم الإذن (الذي يُنشئ إمكانية الإشهاد) والحكم التنفيذي (المرتبط بالتنفيذ الجبري).</p>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={() => setState(prev => ({ ...prev, step: 2 }))}
          disabled={divorceState.hasJudicialPermission !== 'yes'}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          التالي: بيانات الزوجين
        </button>
      </div>
    </div>
  );
};

export const Step2_Divorce_Spouses: React.FC<StepProps> = ({ state, setState }) => {
  const updateDivorceState = (updates: Partial<NonNullable<FeesAgentState['divorceCertification']>>) => {
    setState(prev => ({
      ...prev,
      divorceCertification: { ...prev.divorceCertification!, ...updates }
    }));
  };

  const updateSpouse = (type: 'husband' | 'wife', field: string, value: any) => {
    const current = state.divorceCertification![type] || {};
    updateDivorceState({
      [type]: { ...current, [field]: value }
    });
  };

  const updateProxy = (type: 'husband' | 'wife', field: string, value: any) => {
    const currentSpouse = state.divorceCertification![type] || {};
    const currentProxy = currentSpouse.proxyDetails || {};
    updateDivorceState({
      [type]: {
        ...currentSpouse,
        proxyDetails: { ...currentProxy, [field]: value }
      }
    });
  };

  const updateProxyDeed = (type: 'husband' | 'wife', field: string, value: any) => {
    const currentSpouse = state.divorceCertification![type] || {};
    const currentProxy = currentSpouse.proxyDetails || {};
    const currentDeed = currentProxy.proxyDeed || {};
    updateDivorceState({
      [type]: {
        ...currentSpouse,
        proxyDetails: {
          ...currentProxy,
          proxyDeed: { ...currentDeed, [field]: value }
        }
      }
    });
  };

  const divorceState = state.divorceCertification!;

  const renderSpouseForm = (type: 'husband' | 'wife', title: string) => {
    const spouse = divorceState[type];
    return (
      <div className="border p-4 rounded-lg bg-gray-50">
        <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">الاسم الكامل</label>
            <input
              type="text"
              value={spouse?.name || ''}
              onChange={(e) => updateSpouse(type, 'name', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">الجنسية</label>
            <select
              value={spouse?.nationality || ''}
              onChange={(e) => updateSpouse(type, 'nationality', e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">—</option>
              <option value="مغربي">مغربي</option>
              <option value="اجنبي">أجنبي</option>
            </select>
          </div>
          {spouse?.nationality === 'اجنبي' && (
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">الاسم الكامل (بالأحرف اللاتينية)</label>
              <input
                type="text"
                dir="ltr"
                value={spouse?.nameLatin || ''}
                onChange={(e) => updateSpouse(type, 'nameLatin', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Full name in Latin alphabet"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">تاريخ الازدياد</label>
            <input
              type="date"
              value={spouse?.dateOfBirth || ''}
              onChange={(e) => updateSpouse(type, 'dateOfBirth', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">مكان الازدياد</label>
            <input
              type="text"
              value={spouse?.placeOfBirth || ''}
              onChange={(e) => updateSpouse(type, 'placeOfBirth', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">اسم الأب</label>
            <input
              type="text"
              value={spouse?.fatherName || ''}
              onChange={(e) => updateSpouse(type, 'fatherName', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">اسم الأم</label>
            <input
              type="text"
              value={spouse?.motherName || ''}
              onChange={(e) => updateSpouse(type, 'motherName', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">رقم البطاقة الوطنية</label>
            <input
              type="text"
              value={spouse?.idNumber || ''}
              onChange={(e) => updateSpouse(type, 'idNumber', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">العنوان</label>
            <input
              type="text"
              value={spouse?.address || ''}
              onChange={(e) => updateSpouse(type, 'address', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">الحالة</label>
            <select
              value={spouse?.presence || 'present'}
              onChange={(e) => updateSpouse(type, 'presence', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="present">حاضر</option>
              <option value="proxy">موكل عنه</option>
              <option value="judicial_permission">إذن قضائي</option>
            </select>
          </div>
        </div>

        {spouse?.presence === 'proxy' && (
          <div className="mt-4 p-4 bg-white border rounded-lg">
            <h5 className="font-bold text-blue-800 mb-3">بيانات الوكيل</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اسم الوكيل</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.fullName || ''}
                  onChange={(e) => updateProxy(type, 'fullName', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">تاريخ الازدياد</label>
                <input
                  type="date"
                  value={spouse.proxyDetails?.dateOfBirth || ''}
                  onChange={(e) => updateProxy(type, 'dateOfBirth', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم البطاقة الوطنية</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.idNumber || ''}
                  onChange={(e) => updateProxy(type, 'idNumber', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">العنوان</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.address || ''}
                  onChange={(e) => updateProxy(type, 'address', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اسم الأب</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.fatherName || ''}
                  onChange={(e) => updateProxy(type, 'fatherName', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اسم الأم</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.motherName || ''}
                  onChange={(e) => updateProxy(type, 'motherName', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <h5 className="font-bold text-blue-800 mt-4 mb-3">مراجع الوكالة</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">الدفتر</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.proxyDeed?.bookReference || ''}
                  onChange={(e) => updateProxyDeed(type, 'bookReference', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">العدد</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.proxyDeed?.number || ''}
                  onChange={(e) => updateProxyDeed(type, 'number', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">الصحيفة</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.proxyDeed?.page || ''}
                  onChange={(e) => updateProxyDeed(type, 'page', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">عدد متتابع</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.proxyDeed?.count || ''}
                  onChange={(e) => updateProxyDeed(type, 'count', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                <input
                  type="date"
                  value={spouse.proxyDetails?.proxyDeed?.date || ''}
                  onChange={(e) => updateProxyDeed(type, 'date', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">التوثيق</label>
                <input
                  type="text"
                  value={spouse.proxyDetails?.proxyDeed?.notary || ''}
                  onChange={(e) => updateProxyDeed(type, 'notary', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="مثال: توثيق الرباط"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
        <h3 className="font-bold text-lg text-blue-900 mb-2">2. بيانات الزوجين</h3>
        <p className="text-sm text-blue-800">أدخل بيانات الزوج والزوجة وحالة حضورهما.</p>
      </div>

      {renderSpouseForm('husband', 'بيانات الزوج')}
      {renderSpouseForm('wife', 'بيانات الزوجة')}

      <div className="flex justify-between pt-6">
        <button
          onClick={() => setState(prev => ({ ...prev, step: 1 }))}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          السابق
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, step: 3 }))}
          disabled={!divorceState.husband?.name || !divorceState.wife?.name}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          التالي: تفاصيل الزواج والطلاق
        </button>
      </div>
    </div>
  );
};

export const Step3_Divorce_MarriageDetails: React.FC<StepProps> = ({ state, setState }) => {
  const updateDivorceState = (updates: Partial<NonNullable<FeesAgentState['divorceCertification']>>) => {
    setState(prev => ({
      ...prev,
      divorceCertification: { ...prev.divorceCertification!, ...updates }
    }));
  };

  const updateMoroccanContract = (field: string, value: any) => {
    const current = state.divorceCertification!.moroccanContractDetails || {};
    updateDivorceState({
      moroccanContractDetails: { ...current, [field]: value }
    });
  };

  const updateForeignContract = (field: string, value: any) => {
    const current = state.divorceCertification!.foreignContractDetails || {};
    updateDivorceState({
      foreignContractDetails: { ...current, [field]: value }
    });
  };

  const divorceState = state.divorceCertification!;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
        <h3 className="font-bold text-lg text-blue-900 mb-2">3. تفاصيل الزواج والطلاق</h3>
        <p className="text-sm text-blue-800">حدد طبيعة عقد الزواج وتفاصيل الطلاق.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">طبيعة عقد الزواج</label>
          <select
            value={divorceState.marriageContractType}
            onChange={(e) => updateDivorceState({ marriageContractType: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="moroccan">عقد زواج مغربي</option>
            <option value="foreign">عقد زواج أجنبي</option>
            <option value="unregistered">غير موثق (ثبوت الزوجية)</option>
          </select>
        </div>

        {divorceState.marriageContractType === 'moroccan' && (
          <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-bold text-gray-800 mb-3">مراجع عقد الزواج المغربي</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">الدفتر</label>
                <input
                  type="text"
                  value={divorceState.moroccanContractDetails?.bookReference || ''}
                  onChange={(e) => updateMoroccanContract('bookReference', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">العدد</label>
                <input
                  type="text"
                  value={divorceState.moroccanContractDetails?.number || ''}
                  onChange={(e) => updateMoroccanContract('number', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">الصحيفة</label>
                <input
                  type="text"
                  value={divorceState.moroccanContractDetails?.page || ''}
                  onChange={(e) => updateMoroccanContract('page', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">حرف</label>
                <input
                  type="text"
                  value={divorceState.moroccanContractDetails?.letter || ''}
                  onChange={(e) => updateMoroccanContract('letter', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                <input
                  type="date"
                  value={divorceState.moroccanContractDetails?.date || ''}
                  onChange={(e) => updateMoroccanContract('date', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">التوثيق (المركز/المحكمة)</label>
                <input
                  type="text"
                  value={divorceState.moroccanContractDetails?.notary || ''}
                  onChange={(e) => updateMoroccanContract('notary', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        {divorceState.marriageContractType === 'foreign' && (
          <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-bold text-gray-800 mb-3">مراجع عقد الزواج الأجنبي وحكم التذييل</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم العقد</label>
                <input
                  type="text"
                  value={divorceState.foreignContractDetails?.number || ''}
                  onChange={(e) => updateForeignContract('number', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">تاريخ العقد</label>
                <input
                  type="date"
                  value={divorceState.foreignContractDetails?.date || ''}
                  onChange={(e) => updateForeignContract('date', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">البلد/المدينة</label>
                <input
                  type="text"
                  value={divorceState.foreignContractDetails?.country || ''}
                  onChange={(e) => updateForeignContract('country', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم حكم التذييل</label>
                <input
                  type="text"
                  value={divorceState.foreignContractDetails?.exequaturJudgmentNumber || ''}
                  onChange={(e) => updateForeignContract('exequaturJudgmentNumber', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">تاريخ حكم التذييل</label>
                <input
                  type="date"
                  value={divorceState.foreignContractDetails?.exequaturJudgmentDate || ''}
                  onChange={(e) => updateForeignContract('exequaturJudgmentDate', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">المحكمة المصدرة للتذييل</label>
                <input
                  type="text"
                  value={divorceState.foreignContractDetails?.exequaturCourt || ''}
                  onChange={(e) => updateForeignContract('exequaturCourt', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">عدد الطلقات</label>
          <select
            value={divorceState.divorceCount}
            onChange={(e) => updateDivorceState({ divorceCount: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="first">الطلقة الأولى</option>
            <option value="second">الطلقة الثانية</option>
            <option value="third">الطلقة الثالثة (بائن)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">حالة الدخول</label>
          <select
            value={divorceState.consummationStatus}
            onChange={(e) => updateDivorceState({ consummationStatus: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="before">قبل الدخول</option>
            <option value="after">بعد الدخول</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">الأبناء</label>
          <select
            value={divorceState.hasChildren}
            onChange={(e) => updateDivorceState({ hasChildren: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="no">لا يوجد أبناء</option>
            <option value="yes">يوجد أبناء</option>
          </select>
        </div>

        {divorceState.hasChildren === 'yes' && (
          <div className="md:col-span-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-bold text-yellow-800 mb-3">تفاصيل الأبناء</h4>
            <div className="space-y-4">
              {divorceState.childrenList?.map((child, index) => (
                <div key={index} className="flex gap-4 items-end border-b pb-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600">الاسم</label>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => {
                        const newList = [...(divorceState.childrenList || [])];
                        newList[index].name = e.target.value;
                        updateDivorceState({ childrenList: newList });
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600">تاريخ الازدياد</label>
                    <input
                      type="date"
                      value={child.dateOfBirth}
                      onChange={(e) => {
                        const newList = [...(divorceState.childrenList || [])];
                        newList[index].dateOfBirth = e.target.value;
                        updateDivorceState({ childrenList: newList });
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-600">الجنس</label>
                    <select
                      value={child.sex}
                      onChange={(e) => {
                        const newList = [...(divorceState.childrenList || [])];
                        newList[index].sex = e.target.value as any;
                        updateDivorceState({ childrenList: newList });
                      }}
                      className="w-full p-1 border rounded"
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-600">الحالة</label>
                    <select
                      value={child.legalStatus}
                      onChange={(e) => {
                        const newList = [...(divorceState.childrenList || [])];
                        newList[index].legalStatus = e.target.value as any;
                        updateDivorceState({ childrenList: newList });
                      }}
                      className="w-full p-1 border rounded"
                    >
                      <option value="minor">قاصر</option>
                      <option value="adult">راشد</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const newList = divorceState.childrenList?.filter((_, i) => i !== index);
                      updateDivorceState({ childrenList: newList });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newList = [...(divorceState.childrenList || []), { name: '', dateOfBirth: '', sex: 'male', legalStatus: 'minor' }];
                  updateDivorceState({ childrenList: newList });
                }}
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                + إضافة ابن
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={() => setState(prev => ({ ...prev, step: 2 }))}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          السابق
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, step: 4 }))}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          التالي: منطوق الحكم
        </button>
      </div>
    </div>
  );
};

export const Step4_Divorce_Summary: React.FC<StepProps> = ({ state, setState }) => {
  const updateDivorceState = (updates: Partial<NonNullable<FeesAgentState['divorceCertification']>>) => {
    setState(prev => ({
      ...prev,
      divorceCertification: { ...prev.divorceCertification!, ...updates }
    }));
  };

  const divorceState = state.divorceCertification!;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
        <h3 className="font-bold text-lg text-blue-900 mb-2">4. ملخص منطوق الحكم</h3>
        <p className="text-sm text-blue-800">أدخل ملخصاً لمنطوق الحكم القاضي بالطلاق.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">نص منطوق الحكم</label>
        <textarea
          value={divorceState.judgmentSummary}
          onChange={(e) => updateDivorceState({ judgmentSummary: e.target.value })}
          className="w-full p-4 border rounded h-48 focus:ring-2 focus:ring-blue-500"
          placeholder="أدخل نص الحكم هنا... مثال: حكمت المحكمة بتطليق الزوجة... طلقة أولى بائنة..."
        />
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={() => setState(prev => ({ ...prev, step: 3 }))}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          السابق
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, step: 6 }))}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          التالي: التواريخ
        </button>
      </div>
    </div>
  );
};
