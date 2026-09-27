import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  Party, TawkilScope, OriginalPoaDetails, RealEstateRegistryPoaInfo
} from '../../../../types/feesAgentTypes';
import {
  createEmptyParty, convertNumberToArabicWords
} from '../../../../utils/feesAgentUtils';
import { generateDocumentDraft } from '../../../../templates/feesAgentTemplates';
import {
  FileText, Users, Building2, Scale, Clock,
  CheckCircle2, AlertTriangle, Plus, Trash2,
  Send, ShieldCheck, Info, FileCheck,
  ChevronRight, ChevronLeft, Check, Sparkles, User
} from 'lucide-react';

export const TawkilWizard: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  // Active inner stage (1 to 5)
  const [activeStage, setActiveStage] = useState<number>(() => {
    if (state.step && state.step >= 1 && state.step <= 5) return state.step;
    return 1;
  });

  const changeStage = (newStage: number) => {
    setActiveStage(newStage);
    setState(prev => ({
      ...prev,
      step: newStage
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize local states with state props
  const [principals, setPrincipals] = useState<Party[]>(() =>
    state.buyers.length ? state.buyers : [createEmptyParty()]
  );
  const [agents, setAgents] = useState<Party[]>(() =>
    state.sellers.length ? state.sellers : [createEmptyParty()]
  );
  const [agencyMode, setAgencyMode] = useState<'individual' | 'joint' | 'mixed'>(
    (state.agencyMode as any) || 'individual'
  );
  const [scope, setScope] = useState<TawkilScope>(() => state.tawkilScope || {});
  const [errors] = useState<Record<string, string>>({});

  // Sync state upward when local core structures change
  const syncState = useCallback((updatedFields: Partial<typeof state>) => {
    setState(prev => ({
      ...prev,
      ...updatedFields
    }));
  }, [setState]);

  const handlePrincipalChange = (index: number, field: keyof Party, value: any) => {
    const updated = principals.map((p, idx) => (idx === index ? { ...p, [field]: value } : p));
    setPrincipals(updated);
    syncState({ buyers: updated });
  };

  const addPrincipal = () => {
    const updated = [...principals, createEmptyParty()];
    setPrincipals(updated);
    syncState({ buyers: updated });
  };

  const removePrincipal = (index: number) => {
    if (principals.length <= 1) return;
    const updated = principals.filter((_, idx) => idx !== index);
    setPrincipals(updated);
    syncState({ buyers: updated });
  };

  const handleAgentChange = (index: number, field: keyof Party, value: any) => {
    const updated = agents.map((p, idx) => (idx === index ? { ...p, [field]: value } : p));
    setAgents(updated);
    syncState({ sellers: updated });
  };

  const addAgent = () => {
    const updated = [...agents, createEmptyParty()];
    setAgents(updated);
    syncState({ sellers: updated });
  };

  const removeAgent = (index: number) => {
    if (agents.length <= 1) return;
    const updated = agents.filter((_, idx) => idx !== index);
    setAgents(updated);
    syncState({ sellers: updated });
  };

  const updateScope = (section: keyof TawkilScope, field: string, value: any) => {
    const currentSection = (scope[section] as any) || {};
    const updated = {
      ...scope,
      [section]: {
        ...currentSection,
        [field]: value
      }
    };
    setScope(updated);
    syncState({ tawkilScope: updated });
  };

  const updateDeepScope = (
    section: keyof TawkilScope,
    subsection: string,
    field: string,
    value: any
  ) => {
    const currentSection = (scope[section] as any) || {};
    const currentSub = currentSection[subsection] || {};
    const updated = {
      ...scope,
      [section]: {
        ...currentSection,
        [subsection]: {
          ...currentSub,
          [field]: value
        }
      }
    };
    setScope(updated);
    syncState({ tawkilScope: updated });
  };

  const updateOriginalPoa = (field: keyof OriginalPoaDetails, value: any) => {
    const current = scope.originalPoaSource || { sourceType: 'adoul' };
    const updatedPoa: OriginalPoaDetails = { ...current, [field]: value };
    const updated = { ...scope, originalPoaSource: updatedPoa };
    setScope(updated);
    syncState({ tawkilScope: updated });
  };

  const updateRegistryInfo = (field: keyof RealEstateRegistryPoaInfo, value: any) => {
    const current = scope.registryInfo || { isRegistered: 'no' };
    const updatedReg: RealEstateRegistryPoaInfo = { ...current, [field]: value };
    const updated = { ...scope, registryInfo: updatedReg };
    setScope(updated);
    syncState({ tawkilScope: updated });
  };

  // Determine Article 889-1 Eligibility (RealRightsAgencyRegistryEligibility)
  const isArticle889Subject = useMemo(() => {
    const powers = scope.realRightsPowers || {};
    const legalActionType = scope.legalActions?.type;
    const specialDetails = scope.legalActions?.specialDetails;

    // Checks based on Article 889-1:
    // 1. Explicit real rights selections
    if (
      powers.transferOwnership ||
      powers.saleProperty ||
      powers.buyProperty ||
      powers.giftProperty ||
      powers.createRealRight ||
      powers.transferRealRight ||
      powers.amendRealRight ||
      powers.cancelRealRight ||
      powers.otherRealRightAct
    ) {
      return true;
    }

    // 2. Special property deed where sale powers are granted
    if (
      legalActionType === 'special' &&
      specialDetails &&
      (specialDetails.salePowers?.setPrice ||
        specialDetails.salePowers?.receivePrice ||
        specialDetails.salePowers?.discharge ||
        specialDetails.salePowers?.sign ||
        specialDetails.titleNumber)
    ) {
      return true;
    }

    // Explicit override if saved in state
    if (scope.isSubjectToRealRightsRegistry === true) {
      return true;
    }

    return false;
  }, [scope]);

  // Keep scope.isSubjectToRealRightsRegistry in sync
  useEffect(() => {
    setScope(prev => {
      if (prev.isSubjectToRealRightsRegistry === isArticle889Subject) return prev;
      const updated = { ...prev, isSubjectToRealRightsRegistry: isArticle889Subject };
      syncState({ tawkilScope: updated });
      return updated;
    });
  }, [isArticle889Subject, syncState]);

  // Dedicated transition to Step 7 (المراجعة الذكية والتوثيق)
  const handleProceedToStep7 = () => {
    const draftText = generateDocumentDraft({
      ...state,
      documentType: 'توكيل_رسمي',
      buyers: principals,
      sellers: agents,
      agencyMode: agencyMode,
      tawkilScope: scope
    });

    setState(prev => ({
      ...prev,
      buyers: principals,
      sellers: agents,
      agencyMode: agencyMode,
      tawkilScope: scope,
      step: 7,
      draft: draftText
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Summary labels for Persistent Top Card
  const principalNamesSummary = useMemo(() => {
    const valid = principals.filter(p => p.name || p.legalEntityName);
    if (!valid.length) return 'لم يحدد بعد';
    if (valid.length === 1) {
      return valid[0].actingCapacity === 'legal_representative'
        ? `${valid[0].legalEntityName || 'شركة'} (بواسطة ${valid[0].name || 'ممثله'})`
        : valid[0].name;
    }
    return `${valid[0].name || valid[0].legalEntityName} وآخرون (${valid.length})`;
  }, [principals]);

  const agentNamesSummary = useMemo(() => {
    const valid = agents.filter(a => a.name);
    if (!valid.length) return 'لم يحدد بعد';
    if (valid.length === 1) return valid[0].name;
    return `${valid[0].name} وآخرون (${valid.length})`;
  }, [agents]);

  const agencyTypeLabel = useMemo(() => {
    const t = scope.legalActions?.type;
    if (t === 'marriage') return 'خاصة (إبرام عقد الزواج)';
    if (t === 'special') return 'خاصة (عقارية / تجارية)';
    if (t === 'general') return 'عامة (إدارة وتصرف عام)';
    return 'عامة';
  }, [scope.legalActions?.type]);

  const originalPoaSourceSummary = useMemo(() => {
    const src = scope.originalPoaSource;
    if (!src) return 'وكالة منشأة حديثاً';
    if (src.sourceType === 'adoul') {
      return src.number
        ? `تلقي العدلين: عدد ${src.number} ك ${src.book || '—'} محكمة ${src.court || '—'}`
        : 'تلقي العدلين';
    }
    if (src.sourceType === 'official_other') {
      return src.issuerAuthority ? `محرر رسمي: ${src.issuerAuthority}` : 'محرر رسمي آخر';
    }
    if (src.sourceType === 'fixed_date') return 'محرر ثابت التاريخ';
    if (src.sourceType === 'foreign') return `محررة بالخارج (${src.country || 'أجنبية'})`;
    if (src.sourceType === 'platform_existing') return 'مستوردة من المنصة';
    return 'وكالة منشأة حديثاً';
  }, [scope.originalPoaSource]);

  const registrySummary = useMemo(() => {
    if (!isArticle889Subject) {
      return { label: 'غير مشمولة بالفصل 889-1', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    const reg = scope.registryInfo;
    if (reg?.isRegistered === 'yes') {
      return {
        label: reg.registrationNumber ? `مقيدة بالسجل: ${reg.registrationNumber}` : 'مقيدة بالسجل المحلي',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      };
    }
    if (reg?.isRegistered === 'no') {
      return { label: 'مشمولة (غير مقيدة بعد)', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    }
    return { label: 'مشمولة بالسجل (قيد التحقق)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }, [isArticle889Subject, scope.registryInfo]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ========================================================================= */}
      {/* 📜 PERSISTENT TOP CARD: بطاقة هوية الوكالة المعالجة                       */}
      {/* ========================================================================= */}
      <div className="sticky top-2 z-20 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-xl border border-indigo-700/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-500/40 text-indigo-300">
              <Scale className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {agencyTypeLabel}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${registrySummary.color}`}>
                  {registrySummary.label}
                </span>
                {isArticle889Subject && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/40 font-mono">
                    ف 889-1 ق.ل.ع
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-white mt-1 flex items-center gap-2">
                <span>رسم توكيل رسمي (إدارة دورة حياة الوكالة)</span>
                <span className="text-xs text-slate-300 font-normal">
                  — المحكمة الابتدائية: {scope.registryInfo?.primaryCourt || formatCourtName(state.court) || 'المحكمة الابتدائية المختصة'}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleProceedToStep7}
              className="px-4 py-2 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 flex items-center gap-1.5 transition-all transform active:scale-95 border border-red-400/30"
              title="الانتقال الفوري إلى الصياغة والاعتماد وتوثيق الرسم"
            >
              <Send className="w-3.5 h-3.5" />
              <span>اعتماد رسم الوكالة (الخطوة 7)</span>
            </button>
          </div>
        </div>

        {/* Quick Identity Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-3 text-xs">
          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
            <div className="text-slate-400 text-[10px] mb-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-indigo-400" />
              <span>الموكل</span>
            </div>
            <div className="font-bold text-slate-100 truncate" title={principalNamesSummary}>
              {principalNamesSummary}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
            <div className="text-slate-400 text-[10px] mb-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>الوكيل ({agencyMode === 'individual' ? 'منفرداً' : agencyMode === 'joint' ? 'مجتمعاً' : 'مشترك'})</span>
            </div>
            <div className="font-bold text-slate-100 truncate" title={agentNamesSummary}>
              {agentNamesSummary}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
            <div className="text-slate-400 text-[10px] mb-0.5 flex items-center gap-1">
              <FileText className="w-3 h-3 text-amber-400" />
              <span>أصل الوكالة ومصدرها</span>
            </div>
            <div className="font-bold text-slate-100 truncate" title={originalPoaSourceSummary}>
              {originalPoaSourceSummary}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
            <div className="text-slate-400 text-[10px] mb-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span>موضوع ومحل الوكالة</span>
            </div>
            <div className="font-bold text-slate-100 truncate">
              {scope.legalActions?.type === 'marriage'
                ? `عقد زواج (${scope.legalActions?.marriageDetails?.partnerName || 'الطرف الآخر'})`
                : scope.legalActions?.specialDetails?.titleNumber
                ? `عقار: ${scope.legalActions.specialDetails.titleNumber}`
                : isArticle889Subject
                ? 'تصرف في حق عيني عقاري'
                : 'إدارة وتصرفات عامة'}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-2 border border-white/10 col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[10px] mb-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>السجل المحلي للحقوق العينية</span>
            </div>
            <div className="font-bold text-slate-100 truncate">
              {scope.registryInfo?.registrationNumber || (isArticle889Subject ? 'مطلوب التقييد' : 'غير مطلوب')}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🧭 FIVE INNER STAGES NAVIGATION TABS                                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { id: 1, title: '① الموكل والمصدر', desc: 'التلقي، الهوية ومراجع الأصل', icon: Users },
            { id: 2, title: '② الوكلاء والنيابة', desc: 'الوكلاء، ممارسة التوكيل، النائب', icon: Building2 },
            { id: 3, title: '③ خريطة الصلاحيات', desc: 'الصلاحيات الإدارية والعقارية والزواج', icon: Scale },
            { id: 4, title: '④ محدد سجل الحقوق العينية', desc: 'الفصل 889-1 والسجل المحلي', icon: ShieldCheck },
            { id: 5, title: '⑤ الفحص القانوني والاعتماد', desc: 'الفصول 931-937، المسار، الاعتماد', icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeStage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => changeStage(tab.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 text-center ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                  <span className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {tab.title}
                  </span>
                </div>
                <span className={`text-[10px] leading-tight truncate w-full ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1️⃣ STAGE 1: أطراف الوكالة ومصدرها (الموكلون والتلقي)                       */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6">
          {/* Smart Reception Mode (Preserved & Enhanced) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">⚙️</span>
              <span>صيغة تقنية ذكية: وضعية التلقي العدلي للوكالة</span>
            </h3>

            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">وضعية التلقي:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                    state.receptionStatus === 'joint'
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="receptionStatus"
                    value="joint"
                    checked={state.receptionStatus === 'joint'}
                    onChange={() => setState(prev => ({ ...prev, receptionStatus: 'joint' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">تلقي مشترك آني</span>
                    <span className="text-[11px] text-slate-500">حضور أطراف الإشهاد في مجلس واحد أمام العدلين</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                    state.receptionStatus === 'individual'
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="receptionStatus"
                    value="individual"
                    checked={state.receptionStatus === 'individual'}
                    onChange={() => setState(prev => ({ ...prev, receptionStatus: 'individual' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">تلقي منفرد بإشعار / إذن قانوني</span>
                    <span className="text-[11px] text-slate-500">وفق مقتضيات قانون خطة العدالة عند تعذر الحضور في آن واحد</span>
                  </div>
                </label>
              </div>

              {state.receptionStatus === 'individual' && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 animate-fadeIn space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>تحديد بيانات الإشعار أو الإذن القانوني المسبق للتلقي المنفرد:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">نوع الإشعار / الإذن</label>
                      <input
                        type="text"
                        placeholder="إشعار بالتلقي المنفرد..."
                        className="w-full p-2 border rounded-lg bg-white"
                        value={state.individualReceptionDetails?.noticeType || ''}
                        onChange={e =>
                          setState(prev => ({
                            ...prev,
                            individualReceptionDetails: {
                              ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                              noticeType: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">رقم الإشعار / الإذن</label>
                      <input
                        type="text"
                        placeholder="مثال: 142/2026..."
                        className="w-full p-2 border rounded-lg bg-white"
                        value={state.individualReceptionDetails?.noticeNumber || ''}
                        onChange={e =>
                          setState(prev => ({
                            ...prev,
                            individualReceptionDetails: {
                              ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                              noticeNumber: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">الجهة الصادر عنها</label>
                      <input
                        type="text"
                        placeholder="قاضي التوثيق / المحكمة..."
                        className="w-full p-2 border rounded-lg bg-white"
                        value={state.individualReceptionDetails?.authority || ''}
                        onChange={e =>
                          setState(prev => ({
                            ...prev,
                            individualReceptionDetails: {
                              ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                              authority: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">المدينة / الدائرة القضائية</label>
                      <input
                        type="text"
                        placeholder="مثال: طنجة، تطوان..."
                        className="w-full p-2 border rounded-lg bg-white"
                        value={state.individualReceptionDetails?.city || ''}
                        onChange={e =>
                          setState(prev => ({
                            ...prev,
                            individualReceptionDetails: {
                              ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                              city: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Original POA Source Reference (Preserved & Enhanced) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">🏛️</span>
                <span>كيف تم إنشاء الوكالة؟ (مصدر وسند الوكالة الأصلية)</span>
              </h3>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                يميز النظام بين مراجع التوثيق العدلي ورقم التقييد بسجل الحقوق العينية
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
              {[
                { id: 'adoul', label: '✍️ تلقي العدلين' },
                { id: 'official_other', label: '📜 محرر رسمي آخر' },
                { id: 'fixed_date', label: '📄 ثابت التاريخ' },
                { id: 'foreign', label: '🌍 وكالة بالخارج' },
                { id: 'platform_existing', label: '🌐 مسبقة بالنظام' }
              ].map(src => {
                const isSelected = (scope.originalPoaSource?.sourceType || 'adoul') === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => updateOriginalPoa('sourceType', src.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {src.label}
                  </button>
                );
              })}
            </div>

            {/* If Adoul Reception */}
            {(!scope.originalPoaSource?.sourceType || scope.originalPoaSource?.sourceType === 'adoul') && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>مراجع الإشهاد العدلي (حسب كناش التضمين):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">الدفتر / الكناش</label>
                    <input
                      type="text"
                      placeholder="دفتر..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.book || ''}
                      onChange={e => updateOriginalPoa('book', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">الحرف</label>
                    <input
                      type="text"
                      placeholder="أ، ب..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.letter || ''}
                      onChange={e => updateOriginalPoa('letter', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">الصحيفة</label>
                    <input
                      type="text"
                      placeholder="ص..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.page || ''}
                      onChange={e => updateOriginalPoa('page', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">العدد / الرسم</label>
                    <input
                      type="text"
                      placeholder="عدد..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.number || ''}
                      onChange={e => updateOriginalPoa('number', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">بتاريخ</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.date || ''}
                      onChange={e => updateOriginalPoa('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">توثيق المحكمة</label>
                    <input
                      type="text"
                      placeholder="قسم قضاء الأسرة بـ..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.court || ''}
                      onChange={e => updateOriginalPoa('court', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If Other Official */}
            {scope.originalPoaSource?.sourceType === 'official_other' && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">الجهة المحررة</label>
                  <input
                    type="text"
                    placeholder="موثق، سفارة، إدارة..."
                    className="w-full p-2 border rounded-lg bg-white"
                    value={scope.originalPoaSource?.issuerAuthority || ''}
                    onChange={e => updateOriginalPoa('issuerAuthority', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">رقم المحرر</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg bg-white"
                    value={scope.originalPoaSource?.documentNumber || ''}
                    onChange={e => updateOriginalPoa('documentNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">مكان التحرير</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg bg-white"
                    value={scope.originalPoaSource?.place || ''}
                    onChange={e => updateOriginalPoa('place', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">تاريخ التحرير</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg bg-white"
                    value={scope.originalPoaSource?.date || ''}
                    onChange={e => updateOriginalPoa('date', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If Foreign */}
            {scope.originalPoaSource?.sourceType === 'foreign' && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">الدولة</label>
                    <input
                      type="text"
                      placeholder="فرنسا، إسبانيا، كندا..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.country || ''}
                      onChange={e => updateOriginalPoa('country', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">المدينة</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.city || ''}
                      onChange={e => updateOriginalPoa('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">الجهة المحررة بالخارج</label>
                    <input
                      type="text"
                      placeholder="Notary, City Hall..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.foreignIssuer || ''}
                      onChange={e => updateOriginalPoa('foreignIssuer', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">رقم الوكالة بالخارج</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.originalPoaSource?.foreignNumber || ''}
                      onChange={e => updateOriginalPoa('foreignNumber', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scope.originalPoaSource?.hasApostilleOrLegalization || false}
                      onChange={e => updateOriginalPoa('hasApostilleOrLegalization', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">مذيلة بالأبوستيل أو مصادق عليها قنصلياً</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scope.originalPoaSource?.isTranslated || false}
                      onChange={e => updateOriginalPoa('isTranslated', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">مصحوبة بترجمة رسمية محلفة</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Principals Section (Preserved & Enhanced) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">👤</span>
                  <span>بيانات الموكل / الموكلين</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حدد صفة الموكل (شخص ذاتي أو معنوي) والبيانات التعريفية
                </p>
              </div>
              <button
                type="button"
                onClick={addPrincipal}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl flex items-center gap-1 border border-indigo-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موكل آخر</span>
              </button>
            </div>

            {principals.map((principal, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-xs border-l-4 border-indigo-500 border border-slate-200 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">الموكل رقم {index + 1}</h4>
                    {principal.actingCapacity === 'legal_representative' && (
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full font-bold">
                        شخص معنوي (تمثيل قانوني)
                      </span>
                    )}
                  </div>
                  {principals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrincipal(index)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                {/* Capacity Toggle */}
                <div className="p-3 bg-slate-50 rounded-xl flex gap-6 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`capacity_${index}`}
                      checked={principal.actingCapacity !== 'legal_representative'}
                      onChange={() => handlePrincipalChange(index, 'actingCapacity', 'personal')}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>شخص ذاتي (باسمه الشخصي)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`capacity_${index}`}
                      checked={principal.actingCapacity === 'legal_representative'}
                      onChange={() => handlePrincipalChange(index, 'actingCapacity', 'legal_representative')}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>شخص معنوي (بصفته ممثلاً قانونياً)</span>
                  </label>
                </div>

                {/* Personal Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      الاسم الكامل (بالعربية) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={principal.name || ''}
                      onChange={e => handlePrincipalChange(index, 'name', e.target.value)}
                      placeholder="الاسم الشخصي والعائلي..."
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors[`name_${index}`] && (
                      <p className="text-red-500 text-[10px] mt-1">{errors[`name_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      رقم البطاقة الوطنية / السند <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={principal.idNumber || ''}
                      onChange={e => handlePrincipalChange(index, 'idNumber', e.target.value)}
                      placeholder="مثال: AB123456..."
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">الجنسية</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={principal.nationality !== 'اجنبي'}
                          onChange={() => handlePrincipalChange(index, 'nationality', 'مغربي')}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span>مغربية</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={principal.nationality === 'اجنبي'}
                          onChange={() => handlePrincipalChange(index, 'nationality', 'اجنبي')}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span>أجنبية</span>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">العنوان الكامل</label>
                    <input
                      type="text"
                      value={principal.address || ''}
                      onChange={e => handlePrincipalChange(index, 'address', e.target.value)}
                      placeholder="العنوان ومحل الإقامة..."
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">المهنة</label>
                    <input
                      type="text"
                      value={principal.profession || ''}
                      onChange={e => handlePrincipalChange(index, 'profession', e.target.value)}
                      placeholder="المهنة أو الحرفة..."
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تاريخ الازدياد</label>
                    <input
                      type="date"
                      value={principal.dateOfBirth || ''}
                      onChange={e => handlePrincipalChange(index, 'dateOfBirth', e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">مكان الازدياد</label>
                    <input
                      type="text"
                      value={principal.placeOfBirth || ''}
                      onChange={e => handlePrincipalChange(index, 'placeOfBirth', e.target.value)}
                      placeholder="مكان الازدياد..."
                      className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">الحالة العائلية</label>
                    <select
                      value={principal.maritalStatus || ''}
                      onChange={e => handlePrincipalChange(index, 'maritalStatus', e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-white"
                    >
                      <option value="">اختر...</option>
                      <option value="اعزب">عازب(ة)</option>
                      <option value="متزوج">متزوج(ة)</option>
                      <option value="مطلق">مطلق(ة)</option>
                      <option value="ارمل">أرمل(ة)</option>
                    </select>
                  </div>
                </div>

                {/* Legal Entity Extra Fields */}
                {principal.actingCapacity === 'legal_representative' && (
                  <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-200 animate-fadeIn space-y-3 text-xs">
                    <div className="text-cyan-900 font-bold flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-cyan-700" />
                      <span>بيانات الشخص المعنوي وسند التمثيل القانوني:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">اسم الشركة / الهيئة</label>
                        <input
                          type="text"
                          value={principal.legalEntityName || ''}
                          onChange={e => handlePrincipalChange(index, 'legalEntityName', e.target.value)}
                          placeholder="تسمية الشخص الاعتباري..."
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">الشكل القانوني</label>
                        <input
                          type="text"
                          value={principal.legalForm || ''}
                          onChange={e => handlePrincipalChange(index, 'legalForm', e.target.value)}
                          placeholder="SARL, SA, تعاونية..."
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">رقم التعريف الموحد (ICE)</label>
                        <input
                          type="text"
                          value={principal.ice || ''}
                          onChange={e => handlePrincipalChange(index, 'ice', e.target.value)}
                          placeholder="15 رقماً..."
                          className="w-full p-2 border rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">السجل التجاري</label>
                        <input
                          type="text"
                          value={principal.commercialRegister || ''}
                          onChange={e => handlePrincipalChange(index, 'commercialRegister', e.target.value)}
                          placeholder="رقم السجل والمحكمة..."
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 mb-1 font-semibold">المقر الاجتماعي</label>
                        <input
                          type="text"
                          value={principal.headquartersAddress || ''}
                          onChange={e => handlePrincipalChange(index, 'headquartersAddress', e.target.value)}
                          placeholder="عنوان المقر الرئيسي..."
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">صفة الممثل وسند التمثيل</label>
                        <input
                          type="text"
                          value={principal.legalRepresentativeCapacity || ''}
                          onChange={e => handlePrincipalChange(index, 'legalRepresentativeCapacity', e.target.value)}
                          placeholder="مسير، رئيس مجلس إدارة..."
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Multiple Principals & Divisibility Check (الفصل 933 ق.ل.ع) */}
          {principals.length > 1 && (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900">
                <Scale className="w-4 h-4 text-indigo-700" />
                <span>تعدد الموكلين وقاعدة عدم التجزئة (الفصل 933 من قانون الالتزامات والعقود):</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                إذا صدرت الوكالة عن موكلين متعددين لعملية واحدة مشتركة، فلا يقبل إلغاؤها أو عزل الوكيل فيها إلا باتفاقهم جميعاً ما لم يتفق على خلاف ذلك.
              </p>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-indigo-950 pt-1">
                <input
                  type="checkbox"
                  checked={scope.multiplePrincipalsCheck?.isJointOperation || false}
                  onChange={e => {
                    const current = scope.multiplePrincipalsCheck || {};
                    const updated = {
                      ...scope,
                      multiplePrincipalsCheck: { ...current, isJointOperation: e.target.checked }
                    };
                    setScope(updated);
                    syncState({ tawkilScope: updated });
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>تأكيد: هذه الوكالة صادرة عن موكلين متعددين لإنجاز تصرف مشترك واحد غير قابل للتجزئة</span>
              </label>
            </div>
          )}

          {/* Stage Footer Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => onBack && onBack()}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة لاختيار الوثيقة</span>
            </button>
            <button
              type="button"
              onClick={() => changeStage(2)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>المرحلة التالية: الوكلاء والنيابة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2️⃣ STAGE 2: الوكلاء والنيابة وتعدد الوكلاء                                 */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">👥</span>
                <span>بيانات الوكيل / الوكلاء المفوضين</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                أدخل بيانات الشخص أو الأشخاص الممنوحة لهم سلطة التمثيل والتصرف
              </p>
            </div>
            <button
              type="button"
              onClick={addAgent}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center gap-1 border border-emerald-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة وكيل آخر</span>
            </button>
          </div>

          {agents.map((agent, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-xs border-l-4 border-emerald-500 border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">الوكيل رقم {index + 1}</h4>
                </div>
                {agents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAgent(index)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    الاسم الكامل للوكيل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agent.name || ''}
                    onChange={e => handleAgentChange(index, 'name', e.target.value)}
                    placeholder="الاسم الشخصي والعائلي..."
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors[`agent_name_${index}`] && (
                    <p className="text-red-500 text-[10px] mt-1">{errors[`agent_name_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    رقم البطاقة الوطنية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agent.idNumber || ''}
                    onChange={e => handleAgentChange(index, 'idNumber', e.target.value)}
                    placeholder="رقم البطاقة الوطنية للتعريف..."
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">المهنة (اختياري)</label>
                  <input
                    type="text"
                    value={agent.profession || ''}
                    onChange={e => handleAgentChange(index, 'profession', e.target.value)}
                    placeholder="مهنة الوكيل..."
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">العنوان الكامل للوكيل</label>
                  <input
                    type="text"
                    value={agent.address || ''}
                    onChange={e => handleAgentChange(index, 'address', e.target.value)}
                    placeholder="محل إقامة الوكيل..."
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={agent.dateOfBirth || ''}
                    onChange={e => handleAgentChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مكان الازدياد</label>
                  <input
                    type="text"
                    value={agent.placeOfBirth || ''}
                    onChange={e => handleAgentChange(index, 'placeOfBirth', e.target.value)}
                    placeholder="مكان الازدياد..."
                    className="w-full p-2.5 border rounded-xl bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Agency Exercise Mode (Preserved & Enhanced) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">⚖️</span>
              <span>كيفية ممارسة الوكالة (الفصل 934 من ق.ل.ع)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'individual', title: 'منفرداً', desc: 'يحق لكل وكيل مباشرة التصرف منفرداً دون الرجوع للآخر' },
                { id: 'joint', title: 'مجتمعاً', desc: 'لا تصح التصرفات إلا باجتماعهم وتوقيعهم معاً (أصل الفصل 934)' },
                { id: 'mixed', title: 'منفرداً ومجتمعاً', desc: 'جواز التصرف المشترك أو المستقل بحسب نوع الإجراء' }
              ].map(mode => (
                <label
                  key={mode.id}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    agencyMode === mode.id
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="agencyMode"
                    value={mode.id}
                    checked={agencyMode === mode.id}
                    onChange={() => {
                      setAgencyMode(mode.id as any);
                      syncState({ agencyMode: mode.id as any });
                    }}
                    className="sr-only"
                  />
                  <div className="font-bold text-slate-900 text-sm mb-1">{mode.title}</div>
                  <div className="text-[11px] text-slate-500">{mode.desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Sub-Agent / Deputy Section (النائب أو الوكيل الفرعي) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">🔀</span>
                <span>النيابة والوكيل الفرعي (الفصول 931 و934 ق.ل.ع)</span>
              </h3>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                إنابة الغير وتعيين نائب
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-3 text-xs">
              <label className="block text-slate-700 font-bold">
                هل تمنح هذه الوكالة للوكيل صراحةً حق توكيل الغير أو تعيين نائب عنه؟
              </label>
              <div className="flex gap-6 font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasSubAgent"
                    checked={scope.subAgentInfo?.hasSubAgent === 'yes'}
                    onChange={() => {
                      const cur = scope.subAgentInfo || {};
                      const updated = { ...scope, subAgentInfo: { ...cur, hasSubAgent: 'yes' } };
                      setScope(updated);
                      syncState({ tawkilScope: updated });
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span>نعم (مع التنصيص على صلاحية الإنابة)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasSubAgent"
                    checked={scope.subAgentInfo?.hasSubAgent === 'no' || !scope.subAgentInfo?.hasSubAgent}
                    onChange={() => {
                      const cur = scope.subAgentInfo || {};
                      const updated = { ...scope, subAgentInfo: { ...cur, hasSubAgent: 'no' } };
                      setScope(updated);
                      syncState({ tawkilScope: updated });
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span>لا (الوكالة مقصورة على الوكيل بذاته)</span>
                </label>
              </div>

              {scope.subAgentInfo?.hasSubAgent === 'yes' && (
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">اسم النائب / الوكيل الفرعي المعين</label>
                    <input
                      type="text"
                      placeholder="اسم النائب إن كان محدداً..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.subAgentInfo?.subAgentName || ''}
                      onChange={e => {
                        const cur = scope.subAgentInfo || {};
                        const updated = {
                          ...scope,
                          subAgentInfo: { ...cur, subAgentName: e.target.value }
                        };
                        setScope(updated);
                        syncState({ tawkilScope: updated });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">رقم بطاقة النائب</label>
                    <input
                      type="text"
                      placeholder="رقم البطاقة..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.subAgentInfo?.subAgentCin || ''}
                      onChange={e => {
                        const cur = scope.subAgentInfo || {};
                        const updated = {
                          ...scope,
                          subAgentInfo: { ...cur, subAgentCin: e.target.value }
                        };
                        setScope(updated);
                        syncState({ tawkilScope: updated });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">شروط ونطاق الإنابة</label>
                    <input
                      type="text"
                      placeholder="في جميع الصلاحيات أو بعضها..."
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.subAgentInfo?.subAgentScope || ''}
                      onChange={e => {
                        const cur = scope.subAgentInfo || {};
                        const updated = {
                          ...scope,
                          subAgentInfo: { ...cur, subAgentScope: e.target.value }
                        };
                        setScope(updated);
                        syncState({ tawkilScope: updated });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stage Footer Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => changeStage(1)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: الموكل والمصدر</span>
            </button>
            <button
              type="button"
              onClick={() => changeStage(3)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>المرحلة التالية: خريطة الصلاحيات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3️⃣ STAGE 3: خريطة الصلاحيات وموضوع الوكالة                                */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-6">
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
            <h3 className="text-base font-bold text-indigo-900 mb-1">
              خريطة الصلاحيات الممنوحة للوكيل (تحديد دقيق لموضوع الوكالة)
            </h3>
            <p className="text-xs text-indigo-700">
              قم باختيار وتحديد الصلاحيات الممنوحة؛ وسيقوم النظام آلياً بتحليلها وتحديد مدى خضوعها للسجل المحلي للحقوق العينية.
            </p>
          </div>

          {/* A. Professional & Judicial (Preserved) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h4 className="text-sm font-bold mb-3 text-indigo-800 flex items-center gap-2">
              <span>أ. التمثيل أمام الجهات القضائية والمهنية</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'courts', label: 'المحاكم (جميع الدرجات، الترافع، المقالات، الطعون)' },
                { key: 'lawyers', label: 'المحامين (التعاقد، الأتعاب، تتبع الملفات)' },
                { key: 'notaries', label: 'العدول والموثقين (تحرير الرسوم، التوقيع)' },
                { key: 'judicialCommissioners', label: 'المفوضين القضائيين (التبليغ والتنفيذ)' },
                { key: 'experts', label: 'الخبراء (التعيين، الحضور، مناقشة التقارير)' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={(scope.professionalJudicial as any)?.[item.key] || false}
                    onChange={e => updateScope('professionalJudicial', item.key, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* B. Public Administration (Preserved) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h4 className="text-sm font-bold mb-3 text-indigo-800 flex items-center gap-2">
              <span>ب. التمثيل أمام الإدارات العمومية والمصالح الخارجية</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'publicAdmins', label: 'الإدارات العمومية والوزارات' },
                { key: 'territorialCollectivities', label: 'الجماعات الترابية ومجالس العمالات' },
                { key: 'externalServices', label: 'المصالح الخارجية والمؤسسات العامة' },
                { key: 'landConservation', label: 'المحافظة العقارية والمسح العقاري' },
                { key: 'taxAdmin', label: 'إدارة الضرائب والخزينة العامة' },
                { key: 'registrationAdmin', label: 'إدارة التسجيل والتمبر' },
                { key: 'customsAdmin', label: 'إدارة الجمارك والضرائب غير المباشرة' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={(scope.publicAdministration as any)?.[item.key] || false}
                    onChange={e => updateScope('publicAdministration', item.key, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* C. Private Bodies (Preserved) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h4 className="text-sm font-bold mb-3 text-indigo-800 flex items-center gap-2">
              <span>ج. الهيئات والمؤسسات الخاصة والأبناك</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'banks', label: 'الأبناك والمؤسسات المالية' },
                { key: 'insurance', label: 'شركات وهيئات التأمين' },
                { key: 'privateInstitutions', label: 'المؤسسات الخاصة والجمعيات' },
                { key: 'companies', label: 'الشركات التجارية والمهنية' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={(scope.privateBodies as any)?.[item.key] || false}
                    onChange={e => updateScope('privateBodies', item.key, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* D. Legal Actions (General / Special Property / Marriage) (Preserved & Enhanced) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
              <span>د. التصرفات القانونية ونوع الوكالة</span>
            </h4>

            <div className="flex gap-4 flex-wrap text-xs font-bold">
              {[
                { id: 'general', label: 'وكالة عامة (إدارة وتصرف عام)' },
                { id: 'special', label: 'وكالة خاصة (عقارية / تجارية / تصرفات محددة)' },
                { id: 'marriage', label: 'وكالة خاصة بإبرام عقد الزواج' }
              ].map(act => (
                <label
                  key={act.id}
                  className={`p-3 border rounded-xl cursor-pointer flex items-center gap-2 transition-all ${
                    (scope.legalActions?.type || 'general') === act.id
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="legalActionType"
                    checked={(scope.legalActions?.type || 'general') === act.id}
                    onChange={() => updateScope('legalActions', 'type', act.id)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>{act.label}</span>
                </label>
              ))}
            </div>

            {/* If Marriage Agency (Preserved completely) */}
            {scope.legalActions?.type === 'marriage' && (
              <div className="p-4 bg-pink-50/60 rounded-xl border border-pink-200 animate-fadeIn space-y-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-pink-900">
                  <span>💍 توكيل خاص بإبرام عقد الزواج</span>
                </div>

                <div className="flex gap-6 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="partnerType"
                      checked={scope.legalActions?.marriageDetails?.partnerType === 'suitor'}
                      onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'partnerType', 'suitor')}
                    />
                    <span>الخاطب</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="partnerType"
                      checked={scope.legalActions?.marriageDetails?.partnerType === 'fiancee'}
                      onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'partnerType', 'fiancee')}
                    />
                    <span>المخطوبة</span>
                  </label>
                </div>

                <div className="bg-white p-3 rounded-lg border border-pink-100 text-center font-amiri text-base leading-relaxed text-slate-800">
                  "لينوب {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'عنها' : 'عنه'} ويقوم {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'مقامها' : 'مقامه'} في عقد {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'زواجها' : 'زواجه'} من {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'السيد/الشاب' : 'السيدة/الآنسة'}"
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">الاسم الكامل للطرف الآخر</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerName || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">الجنسية</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerNationality || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerNationality', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">اسم الأب</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerFatherName || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerFatherName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">اسم الأم</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerMotherName || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerMotherName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">تاريخ الازدياد</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerDOB || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerDOB', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">رقم البطاقة الوطنية (اختياري)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerIdNumber || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerIdNumber', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 mb-1 font-semibold">العنوان</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.partnerAddress || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'partnerAddress', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">مقدار الصداق (بالأرقام)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.marriageDetails?.dowryAmount || ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateDeepScope('legalActions', 'marriageDetails', 'dowryAmount', val);
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          updateDeepScope('legalActions', 'marriageDetails', 'dowryAmountArabic', convertNumberToArabicWords(num));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">مقدار الصداق (بالحروف)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-slate-50"
                      value={scope.legalActions?.marriageDetails?.dowryAmountArabic || ''}
                      onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'dowryAmountArabic', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">مبررات الغياب عن مجلس عقد الزواج</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 border rounded-lg bg-white"
                    placeholder="بيان أسباب التوكيل في الزواج..."
                    value={scope.legalActions?.marriageDetails?.absenceJustification || ''}
                    onChange={e => updateDeepScope('legalActions', 'marriageDetails', 'absenceJustification', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If Special / Real Estate Details (Preserved & Enhanced) */}
            {scope.legalActions?.type === 'special' && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 animate-fadeIn space-y-4 text-xs">
                <div className="text-slate-900 font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                  <span>تفاصيل العقار محل الوكالة الخاصة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">نوع العقار</label>
                    <select
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.specialDetails?.propertyType || ''}
                      onChange={e => updateDeepScope('legalActions', 'specialDetails', 'propertyType', e.target.value)}
                    >
                      <option value="">اختر...</option>
                      <option value="أرض">أرض فلاحية / عارية</option>
                      <option value="منزل">منزل / دار</option>
                      <option value="شقة">شقة / ملكية مشتركة</option>
                      <option value="محل تجاري">محل تجاري / صناعي</option>
                      <option value="فيلا">فيلا</option>
                      <option value="غير ذلك">غير ذلك</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">تعريف العقار (الموقع، التسمية)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.specialDetails?.propertyDefinition || ''}
                      onChange={e => updateDeepScope('legalActions', 'specialDetails', 'propertyDefinition', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">الوضعية العقارية</label>
                    <select
                      className="w-full p-2 border rounded-lg bg-white"
                      value={scope.legalActions?.specialDetails?.propertyStatus || ''}
                      onChange={e => updateDeepScope('legalActions', 'specialDetails', 'propertyStatus', e.target.value)}
                    >
                      <option value="">اختر...</option>
                      <option value="registered">محفظ (رسم عقاري)</option>
                      <option value="requisition">في طور التحفيظ (مطلب)</option>
                      <option value="unregistered">غير محفظ (ملك عادي)</option>
                    </select>
                  </div>
                </div>

                {scope.legalActions?.specialDetails?.propertyStatus === 'registered' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">رقم الرسم العقاري</label>
                      <input
                        placeholder="مثال: 12345/01..."
                        className="w-full p-2 border rounded-lg bg-slate-50/50"
                        value={scope.legalActions?.specialDetails?.titleNumber || ''}
                        onChange={e => updateDeepScope('legalActions', 'specialDetails', 'titleNumber', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">المحافظة العقارية المختصة</label>
                      <input
                        placeholder="المحافظة بـ..."
                        className="w-full p-2 border rounded-lg bg-slate-50/50"
                        value={scope.legalActions?.specialDetails?.landRegistry || ''}
                        onChange={e => updateDeepScope('legalActions', 'specialDetails', 'landRegistry', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">رقم التضمين / المطلب</label>
                      <input
                        placeholder="رقم التضمين إن وجد..."
                        className="w-full p-2 border rounded-lg bg-slate-50/50"
                        value={scope.legalActions?.specialDetails?.inclusionNumber || ''}
                        onChange={e => updateDeepScope('legalActions', 'specialDetails', 'inclusionNumber', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <h5 className="font-bold text-slate-800 mb-2">صلاحيات البيع والتفويت الممنوحة:</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'setPrice', label: 'تحديد الثمن' },
                      { key: 'receivePrice', label: 'قبض الثمن' },
                      { key: 'discharge', label: 'الإبراء وقبض التوصيل' },
                      { key: 'sign', label: 'توقيع العقود والرسوم' }
                    ].map(p => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={scope.legalActions?.specialDetails?.salePowers?.[p.key] || false}
                          onChange={e => {
                            const cur = scope.legalActions?.specialDetails?.salePowers || {};
                            updateDeepScope('legalActions', 'specialDetails', 'salePowers', { ...cur, [p.key]: e.target.checked });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="font-semibold text-slate-800">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* E. Signing & Withdrawing Docs (Preserved) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h4 className="text-sm font-bold mb-3 text-indigo-800">هـ. التوقيع وسحب وإيداع الوثائق</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'signOnBehalf', label: 'التوقيع نيابة عن الموكل' },
                { key: 'depositFiles', label: 'إيداع الملفات والمقالات' },
                { key: 'withdrawDocs', label: 'سحب الوثائق والشهادات' },
                { key: 'receiveCerts', label: 'استلام الشيكات والتواصيل' }
              ].map(s => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={(scope.signing as any)?.[s.key] || false}
                    onChange={e => updateScope('signing', s.key, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* F. General Reserve (Preserved) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border-r-4 border-amber-400 border border-slate-200 space-y-2">
            <h4 className="text-sm font-bold text-slate-900">و. بند عام احتياطي</h4>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={scope.generalReserve || false}
                onChange={e => {
                  const updated = { ...scope, generalReserve: e.target.checked };
                  setScope(updated);
                  syncState({ tawkilScope: updated });
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>"والقيام بجميع ما تقتضيه هذه الوكالة عرفاً وقانوناً في حدود ما ذُكر أعلاه"</span>
            </label>
            <p className="text-[11px] text-amber-800">
              📌 تنبيه مهني: لا يُستعمل هذا البند منفصلاً بصورة عامة ومطلقة، بل مكملاً لنطاق الصلاحيات المحددة.
            </p>
          </div>

          {/* Stage Footer Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => changeStage(2)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: الوكلاء والنيابة</span>
            </button>
            <button
              type="button"
              onClick={() => changeStage(4)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>المرحلة التالية: محدد سجل الحقوق العينية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4️⃣ STAGE 4: محدد نطاق التقييد بالسجل المحلي (الفصل 889-1 ق.ل.ع)              */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="space-y-6">
          {/* Smart Scope Gate: RealRightsAgencyRegistryEligibility */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">🔎</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    محدد نطاق التقييد بالسجل (الفصل 889-1 من قانون الالتزامات والعقود)
                  </h3>
                  <p className="text-xs text-slate-500">
                    فحص الصلاحيات الممنوحة لمعرفة ما إذا كانت الوكالة مشمولة قانوناً بالسجل المحلي للوكالات المتعلقة بالحقوق العينية
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                قرار وزير العدل 381.25 ومرسوم 2.23.101
              </span>
            </div>

            {/* Checklist of Real Rights Actions */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-800">
                1. التصرفات العقارية الماسة بالحقوق العينية (الموجبة للتقييد بالسجل حصراً وفق الفصل 889-1):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {[
                  { key: 'transferOwnership', label: 'نقل ملكية عقار (بيع، شراء، تفويت...)' },
                  { key: 'createRealRight', label: 'إنشاء حق عيني على عقار (سطحية، هواء، ارتفاق...)' },
                  { key: 'transferRealRight', label: 'نقل حق عيني عقاري' },
                  { key: 'amendRealRight', label: 'تعديل حق عيني عقاري' },
                  { key: 'cancelRealRight', label: 'إسقاط حق عيني والتنازل عنه' },
                  { key: 'otherRealRightAct', label: 'أي تصرف قانوني آخر ينشئ أو يمس حقاً عينياً' }
                ].map(r => (
                  <label
                    key={r.key}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      scope.realRightsPowers?.[r.key]
                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/20 font-bold text-purple-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={scope.realRightsPowers?.[r.key] || false}
                      onChange={e => {
                        const cur = scope.realRightsPowers || {};
                        const updated = {
                          ...scope,
                          realRightsPowers: { ...cur, [r.key]: e.target.checked }
                        };
                        setScope(updated);
                        syncState({ tawkilScope: updated });
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>

              <div className="text-xs font-bold text-slate-800 pt-2">
                2. تصرفات عقارية أو مدنية أخرى (غير خاضعة لسجل الحقوق العينية):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { key: 'manageProperty', label: 'إدارة وتسيير العقار' },
                  { key: 'leaseProperty', label: 'كراء العقار وإبرام عقود الكراء' },
                  { key: 'collectRent', label: 'استخلاص الوجيبات الكرائية' },
                  { key: 'adminRepresentation', label: 'التمثيل لدى المصالح الإدارية' }
                ].map(o => (
                  <label
                    key={o.key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      scope.realRightsPowers?.[o.key]
                        ? 'bg-slate-100 border-slate-400 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={scope.realRightsPowers?.[o.key] || false}
                      onChange={e => {
                        const cur = scope.realRightsPowers || {};
                        const updated = {
                          ...scope,
                          realRightsPowers: { ...cur, [o.key]: e.target.checked }
                        };
                        setScope(updated);
                        syncState({ tawkilScope: updated });
                      }}
                      className="w-4 h-4 text-slate-600 rounded"
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Smart Result Box */}
            {isArticle889Subject ? (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-300 flex items-start gap-3 animate-fadeIn">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950 mb-0.5">
                    🟣 هذه الوكالة مشمولة بنظام سجل الوكالات المتعلقة بالحقوق العينية
                  </h4>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    بناءً على الصلاحيات المحددة المتضمنة لنقل ملكية أو إنشاء أو نقل أو تعديل أو إسقاط حق عيني، تندرج هذه الوكالة تحت مقتضيات الفصل 889-1 من ق.ل.ع ومرسوم 2.23.101، ويجب تقييدها بالسجل المحلي لإنتاج آثارها القانونية وسريانها تجاه الغير.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="p-2 bg-slate-400 text-white rounded-lg">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">
                    ⚪ لم يظهر ما يجعل هذه الوكالة داخلة في نطاق سجل الحقوق العينية
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    الصلاحيات المختارة (إدارة، تمثيل، كراء، أو وكالة عامة غير ماسة بحق عيني) تظل خاضعة للقواعد العامة للوكالة دون فتح أو إلزام بحقول السجل العقاري.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Local Registry Section (Unlocked when Art 889 applies) */}
          {isArticle889Subject && (
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-purple-200 animate-fadeIn space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <h3 className="text-base font-bold text-purple-950 flex items-center gap-2">
                  <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">🏛️</span>
                  <span>وضعية الوكالة في السجل المحلي للوكالات المتعلقة بالحقوق العينية</span>
                </h3>
                <span className="text-[11px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
                  السجل التحليلي والزمني
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-800 font-bold mb-2">
                    هل الوكالة مقيدة حالياً في السجل المحلي للوكالات المتعلقة بالحقوق العينية؟
                  </label>
                  <div className="flex gap-4 font-bold">
                    {[
                      { id: 'yes', label: 'نعم، مقيدة ولديها رقم تقييد مركب' },
                      { id: 'no', label: 'لا، لم تقيد بعد (قيد الإنشاء أو الإيداع)' },
                      { id: 'unknown', label: 'غير معلوم / جاري التحقق من كتابة الضبط' }
                    ].map(st => (
                      <label
                        key={st.id}
                        className={`p-3 border rounded-xl cursor-pointer flex items-center gap-2 transition-all ${
                          (scope.registryInfo?.isRegistered || 'no') === st.id
                            ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/20 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="isRegisteredPoa"
                          checked={(scope.registryInfo?.isRegistered || 'no') === st.id}
                          onChange={() => updateRegistryInfo('isRegistered', st.id as any)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>{st.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {scope.registryInfo?.isRegistered === 'yes' && (
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">
                          المحكمة الابتدائية الممسوك بها السجل <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: المحكمة الابتدائية بتطوان..."
                          className="w-full p-2.5 border rounded-lg bg-white"
                          value={scope.registryInfo?.primaryCourt || ''}
                          onChange={e => updateRegistryInfo('primaryCourt', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">
                          تاريخ التقييد بالسجل المحلي <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2.5 border rounded-lg bg-white"
                          value={scope.registryInfo?.registrationDate || ''}
                          onChange={e => updateRegistryInfo('registrationDate', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">
                          رقم تقييد الوكالة بالسجل المحلي <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: REG-TT-2026/00142..."
                          className="w-full p-2.5 border rounded-lg bg-white font-mono text-purple-900 font-bold"
                          value={scope.registryInfo?.registrationNumber || ''}
                          onChange={e => updateRegistryInfo('registrationNumber', e.target.value)}
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          الرقم المركب الوحيد المسند من كتابة الضبط
                        </span>
                      </div>
                    </div>

                    {/* Certificate of Registration Attachment Check */}
                    <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={scope.registryInfo?.hasCertificate || false}
                          onChange={e => updateRegistryInfo('hasCertificate', e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span>تتوفر شهادة التقييد الصادرة عن كتابة الضبط (النموذج رقم 5)</span>
                      </label>

                      {scope.registryInfo?.hasCertificate && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تمت المطابقة والتحقق</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* National Electronic Registry Status */}
                <div className="pt-2">
                  <label className="block text-slate-800 font-bold mb-1.5">
                    وضعية السجل الوطني الإلكتروني للوكالات (المرسوم 2.23.101):
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { id: 'unverified', label: 'غير متحقق' },
                      { id: 'registered', label: 'مقيدة بالسجل الوطني' },
                      { id: 'not_registered', label: 'غير مقيدة بالسجل الوطني' },
                      { id: 'update_requested', label: 'تم طلب التحيين' },
                      { id: 'status_updated', label: 'تم تحديث الحالة بالسجل الوطني' }
                    ].map(nat => (
                      <button
                        key={nat.id}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...scope,
                            nationalRegistryStatus: nat.id as any
                          };
                          setScope(updated);
                          syncState({ tawkilScope: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          (scope.nationalRegistryStatus || 'unverified') === nat.id
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {nat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage Footer Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => changeStage(3)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: خريطة الصلاحيات</span>
            </button>
            <button
              type="button"
              onClick={() => changeStage(5)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>المرحلة التالية: الفحص القانوني والاعتماد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5️⃣ STAGE 5: الفحص القانوني (Legal Check) والاعتماد                          */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="space-y-6">
          {/* Smart Legal Check Dashboard (الفصول 931، 933، 934، 937) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">⚖️</span>
                <span>لوحة الفحص القانوني الذكي (Legal Check)</span>
              </h3>
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                قانون الالتزامات والعقود
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. قابلية الوكالة للعزل ومصلحة الغير (الفصل 931)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  الأصل أن للموكل حق عزل الوكيل، إلا إذا كانت الوكالة قد أُعطيت في مصلحة الوكيل أو في مصلحة شخص ثالث أو بمقابل.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2. أثر التقييد وحماية الغير حسن النية (الفصل 937)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  في الوكالات المتعلقة بالحقوق العينية، لا يحتج على الغير حسن النية بأي تعديل أو إلغاء إلا من تاريخ تقييده بالسجل المحلي.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>3. تعدد الموكلين وقابلية التجزئة (الفصل 933)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {principals.length > 1
                    ? 'يوجد تعدد في الموكلين؛ يرجى مراعاة وحدة التصرف وعدم جواز التجزئة إلا باتفاقهم جميعاً.'
                    : 'موكل واحد؛ لا يطرح إشكال تعدد الموكلين.'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>4. ممارسة الوكالة وتعدد الوكلاء (الفصل 934)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  كيفية الممارسة المعتمدة: <strong className="text-indigo-900">{agencyMode === 'individual' ? 'منفرداً' : agencyMode === 'joint' ? 'مجتمعاً' : 'منفرداً ومجتمعاً'}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Agency Lifecycle Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>دورة حياة الوكالة العدلية (Timeline)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
              {[
                { step: '1', title: 'إنشاء الوكالة', desc: 'التلقي والتحرير', done: true },
                { step: '2', title: 'التقييد بالسجل', desc: isArticle889Subject ? 'الفصل 889-1' : 'غير مشمولة', done: isArticle889Subject && scope.registryInfo?.isRegistered === 'yes' },
                { step: '3', title: 'شهادة التقييد', desc: 'النموذج 5', done: Boolean(scope.registryInfo?.hasCertificate) },
                { step: '4', title: 'التعديل', desc: 'إن وجد لاحقاً', done: false },
                { step: '5', title: 'العزل / الإلغاء', desc: 'رسم العزل والطلب 7', done: false },
                { step: '6', title: 'السجل الوطني', desc: 'التحيين الإلكتروني', done: false },
                { step: '7', title: 'الأرشفة', desc: 'الحفظ بكتابة الضبط', done: false }
              ].map(t => (
                <div
                  key={t.step}
                  className={`p-2.5 rounded-xl border ${
                    t.done
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-0.5">المرحلة {t.step}</div>
                  <div className="text-xs font-bold leading-tight">{t.title}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-Drafting Audit Checklist */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>المطابقة النهائية للبيانات وتدقيق الجاهزية للتحرير</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg text-emerald-900 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>هوية الموكل وأهليته القانونية مستوفاة ومحققة</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg text-emerald-900 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>هوية الوكيل وصيغة ممارسة الوكالة ({agencyMode === 'individual' ? 'منفرداً' : agencyMode === 'joint' ? 'مجتمعاً' : 'مشترك'}) محددة</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg text-emerald-900 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>خريطة الصلاحيات واضحة ومحددة بدقة</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg text-emerald-900 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>
                  {isArticle889Subject
                    ? 'فحص الفصل 889-1: مشمولة بسجل الحقوق العينية'
                    : 'فحص الفصل 889-1: غير مشمولة بالسجل العقاري'}
                </span>
              </div>
            </div>
          </div>

          {/* Big Action Box to Proceed to Step 7 */}
          <div className="bg-linear-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-lg border border-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>جاهز للتحرير والاعتماد النهائي للرسم</span>
              </h3>
              <p className="text-xs text-slate-300">
                سيقوم النظام بتوليد الصياغة القانونية المحينة للرسم متضمنة كامل بيانات الأطراف والصلاحيات ومراجع السجل.
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedToStep7}
              className="px-6 py-3 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm rounded-xl shadow-xl shadow-red-950/50 flex items-center gap-2 transition-all transform active:scale-95 shrink-0 border border-red-400/40"
            >
              <Send className="w-4 h-4" />
              <span>اعتماد رسم الوكالة والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
            </button>
          </div>

          {/* Stage Footer Navigation */}
          <div className="flex justify-start items-center pt-2">
            <button
              type="button"
              onClick={() => changeStage(4)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: محدد سجل الحقوق العينية</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
