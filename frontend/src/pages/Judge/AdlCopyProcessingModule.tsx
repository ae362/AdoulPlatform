import React, { useState, useMemo, useEffect } from 'react';
import { trpc } from '../../trpc';
import { AdlCopyDocumentView } from '../../components/AdlCopyDocumentView';

interface AdlCopyProcessingModuleProps {
  request: any;
  onComplete: () => void;
}

type ApplicantStatus = 'right_holder' | 'third_party';

export const AdlCopyProcessingModule: React.FC<AdlCopyProcessingModuleProps> = ({ request, onComplete }) => {
  const [phase, setPhase] = useState(1);
  const [applicantStatus, setApplicantStatus] = useState<ApplicantStatus>('right_holder');
  const [decisionType, setDecisionType] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reasoning, setReasoning] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [regNumber, setRegNumber] = useState(`REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [stickyNotes, setStickyNotes] = useState<string[]>([]);
  const [newSticky, setNewSticky] = useState('');
  const [isSent, setIsSent] = useState(false);
  
  const parsedData = useMemo(() => {
    try {
      if (!request.notes || typeof request.notes !== 'string') return null;
      
      const tags = [
        ['--- DATA JSON START ---', '--- DATA JSON END ---'],
        ['--- METADATA START ---', '--- METADATA END ---'],
        ['--- WORKFLOW JSON START ---', '--- WORKFLOW JSON END ---']
      ];

      for (const [startTag, endTag] of tags) {
        if (request.notes.includes(startTag) && request.notes.includes(endTag)) {
          const jsonPart = request.notes.split(startTag)[1].split(endTag)[0].trim();
          return JSON.parse(jsonPart);
        }
      }
    } catch (e) {
      console.error('Failed to parse request JSON', e);
    }
    return null;
  }, [request.notes]);

  const attachments = useMemo(() => {
    let rawAttachments: any[] = [];
    
    // 1. Try column data first
    if (request.attachments) {
      if (Array.isArray(request.attachments)) {
        rawAttachments = request.attachments;
      } else {
        try {
          if (typeof request.attachments === 'string' && request.attachments.trim().length > 0) {
            // Check if it's a JSON string
            if (request.attachments.trim().startsWith('[') || request.attachments.trim().startsWith('{')) {
              rawAttachments = JSON.parse(request.attachments);
            } else {
              // Maybe it's a single URL
              rawAttachments = [request.attachments];
            }
          }
        } catch (e) {
          console.error('Failed to parse attachments column', e);
        }
      }
    }

    // 2. Fallback to JSON notes if column is empty
    if ((!rawAttachments || rawAttachments.length === 0) && parsedData?.uploadedAttachments && Array.isArray(parsedData.uploadedAttachments)) {
      rawAttachments = parsedData.uploadedAttachments;
    }

    // 3. Robust mapping to consistent format
    if (!Array.isArray(rawAttachments)) {
      rawAttachments = rawAttachments ? [rawAttachments] : [];
    }

    // 4. Ultra-fallback: Search for any supabase URLs in the raw notes if still empty
    if (rawAttachments.length === 0 && request.notes) {
      const urlRegex = /(https:\/\/[^\s"'<>\n]+\.supabase\.[^\s"'<>\n]+)/g;
      const matches = request.notes.match(urlRegex);
      if (matches) {
        rawAttachments = matches.map((url: string, i: number) => ({
          url,
          name: `مرفق مستخرج ${i + 1}`,
          type: url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'
        }));
      }
    }

    return rawAttachments.map((att: any, i: number) => {
      // Case 1: Just a string URL
      if (typeof att === 'string') {
        return {
          url: att,
          name: `مرفق ${i + 1}`,
          type: att.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'
        };
      }
      
      // Case 2: Object from NotaryPortalWorkflow or generic attachment object
      const url = att.url || att.uploadedUrl || att.link;
      const name = att.name || att.description || att.type || `مرفق ${i + 1}`;
      const type = att.type || (url?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image');
      
      return { url, name, type };
    }).filter(a => a.url); // Only keep items that actually have a URL
  }, [request.attachments, parsedData]);

  // Simulated Legal Consistency Check
  const [duplicateAlert, setDuplicateAlert] = useState(false);
  
  useEffect(() => {
    if (parsedData?.legalRelationship === 'الأغيار (غير ذي صفة)') {
      setApplicantStatus('third_party');
    }
  }, [parsedData]);

  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation({
    onSuccess: () => {
      setIsSent(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  });

  // Decision Templates
  const templates = {
    thirdPartyApproval: `بعد الاطلاع على الطلب والمرفقات المدلى بها،
وبعد التيقن من أن طالب النسخة لا يمكنه التوصل إلى حقه أو الدفاع عنه إلا بالاطلاع على الرسم المطلوب،
وحيث لا يظهر من ذلك أي مساس بحقوق الغير أو مخالفة للنصوص الجاري بها العمل،
فإن الطلب يكون مبررًا،
وعليه يؤشر بالموافقة على استخراج النسخة المطلوبة في حدود الغرض المبين.`,
    rightHolderApproval: `بناءً على ثبوت صفة طالب النسخة باعتباره من ذوي الحقوق،
وبعد فحص مراجع الرسم والمرفقات،
يؤشر بالموافقة على استخراج النسخة المطلوبة.`,
    rejection: `بعد دراسة الطلب، تبين عدم كفاية التعليلات أو انعدام الصفة،
وعليه تقرر رفض الطلب.`
  };

  useEffect(() => {
    if (decisionType === 'approved') {
      setReasoning(applicantStatus === 'third_party' ? templates.thirdPartyApproval : templates.rightHolderApproval);
      setPhase(3);
    } else if (decisionType === 'rejected') {
      setReasoning(templates.rejection);
      setPhase(3);
    }
  }, [decisionType, applicantStatus]);

  useEffect(() => {
    if (applicantStatus === 'third_party') setPhase(2);
  }, [applicantStatus]);

  const handleFinalSubmit = () => {
    if (applicantStatus === 'third_party' && !reasoning) {
      alert('التعليل إجباري عند اختيار "غير ذي صفة" (الأغيار).');
      return;
    }

    if (decisionType === 'pending') {
      alert('يرجى اتخاذ قرار أولاً.');
      return;
    }

    if (applicantStatus === 'third_party' && !window.confirm('🔔 تنبيه: هل تم التأكد من أن النسخة ستستعمل فقط للغرض المصرح به؟')) {
      return;
    }

    recordDecisionMutation.mutate({
      notificationId: request.id,
      decisionType: decisionType === 'approved' ? 'موافقة' : 'رفض',
      reasoning: reasoning,
      internalNotes: `Registration: ${regNumber}\nStatus: ${applicantStatus}\nInternal: ${internalNotes}\nSticky Notes: ${stickyNotes.join(' | ')}`,
    });
  };

  return (
    <div className="flex h-full flex-col bg-[#f8fafc] overflow-hidden relative" dir="rtl">
      {/* Success Overlay */}
      {isSent && (
        <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-10">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mb-6 animate-bounce shadow-lg border-4 border-emerald-50">
            ✅
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 font-amiri tracking-tight">تم إرسال القرار بنجاح!</h2>
          <p className="text-slate-500 font-bold max-w-sm leading-relaxed">
            تم توقيع الوثيقة رقمياً وإرسال الإشعار فوراً إلى السيد(ة) العدل {request.notary_name}.
          </p>
          <div className="mt-8 flex gap-2">
             <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
             <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse delay-75"></div>
             <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      )}

      {/* 1. Receiving & Header */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-100">
            ⚖️
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">تأشير قاضي التوثيق</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Annotation & Authorization Module</p>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="hidden lg:flex items-center gap-2">
           {[
             { id: 1, label: 'التسجيل' },
             { id: 2, label: 'الفحص' },
             { id: 3, label: 'القرار' },
             { id: 4, label: 'التأشير' }
           ].map((s) => (
             <React.Fragment key={s.id}>
               <div className={`flex flex-col items-center gap-1 group cursor-default`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                    phase >= s.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {s.id}
                  </div>
                  <span className={`text-[8px] font-black uppercase ${phase >= s.id ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
               </div>
               {s.id < 4 && <div className={`w-12 h-0.5 ${phase > s.id ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
             </React.Fragment>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase">رقم الترتيب بالسجل</p>
            <p className="font-mono text-sm font-black text-blue-900 leading-none mt-1">{regNumber}</p>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 text-right text-xs">
            <p className="text-[9px] font-black text-slate-500 uppercase">تاريخ الإيداع</p>
            <p className="font-bold text-slate-800 leading-none mt-1">{new Date(request.created_at).toLocaleDateString('ar-MA')}</p>
          </div>
        </div>
      </div>

      {/* Risk Alerts Bar */}
      {duplicateAlert && (
        <div className="bg-rose-600 text-white p-2 px-6 flex items-center gap-3 animate-pulse">
          <span className="text-lg">⚠️</span>
          <span className="text-xs font-black">Risk Alert: تكرار طلبات استخراج لفائدة الغير لنفس الرسم – يُرجى الانتباه (الرسم رقم {parsedData?.deeds?.[0]?.number})</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Tools & Decisions */}
        <div className="w-[450px] border-l border-slate-200 bg-white flex flex-col shadow-2xl z-10 overflow-y-auto custom-scrollbar">
          
          {/* Section 2: Classification */}
          <div className={`p-6 border-b-4 transition-colors duration-500 ${applicantStatus === 'third_party' ? 'bg-amber-50/50 border-amber-400' : 'bg-blue-50/30 border-blue-400'}`}>
            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${applicantStatus === 'third_party' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`}></span>
              تصنيف صفة الطالب (Classification)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setApplicantStatus('right_holder')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  applicantStatus === 'right_holder' 
                  ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-[1.02]' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-blue-200'
                }`}
              >
                <span className="text-2xl">⭕</span>
                <span className="font-black text-xs">ذو حق</span>
                <span className="text-[9px] opacity-70">(قرابة - وراثة - طرف)</span>
              </button>
              
              <button 
                onClick={() => setApplicantStatus('third_party')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  applicantStatus === 'third_party' 
                  ? 'border-amber-600 bg-amber-600 text-white shadow-lg scale-[1.02]' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-amber-200'
                }`}
              >
                <span className="text-2xl">🔘</span>
                <span className="font-black text-xs">غير ذي صفة (الأغيار)</span>
                <span className="text-[9px] opacity-70">(أجنبي عن الرسم)</span>
              </button>
            </div>

            {applicantStatus === 'third_party' && (
              <div className="mt-4 bg-amber-100/50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-bold leading-relaxed flex items-start gap-2 animate-fadeIn">
                <span>⚠️</span>
                <p>تنبيه: الموافقة لفائدة الغير تستوجب تعليلًا صريحًا يثبت المصلحة المشروعة دون المساس بحقوق الغير.</p>
              </div>
            )}
          </div>

          {/* Section 2.1: Identity Confirmation */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/20">
            <h3 className="text-xs font-black text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span>🪪 التحقق من الهوية (Identification)</span>
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase">رقم وثيقة الهوية:</span>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-mono font-black text-sm border border-blue-100">
                  {parsedData?.idDocumentNumber || 'غير متوفر'}
                </span>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase">نوع الوثيقة:</span>
                <span className="text-xs font-bold text-slate-700">{parsedData?.idDocumentType || 'البطاقة الوطنية'}</span>
              </div>

              {/* ID Card Attachment Display */}
              {parsedData?.idCardUrl ? (
                <div className="mt-4 border-t pt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">صورة وثيقة الهوية المرفقة:</p>
                  <a 
                    href={parsedData.idCardUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group relative rounded-xl overflow-hidden border-2 border-slate-100 hover:border-blue-500 transition-all cursor-zoom-in"
                  >
                    <img 
                      src={parsedData.idCardUrl} 
                      alt="Identity Card" 
                      className="w-full h-32 object-cover grayscale group-hover:grayscale-0 transition-all"
                      onError={(e) => {
                         // Fallback for PDFs or if image fails
                         (e.target as any).style.display = 'none';
                         (e.target as any).nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-slate-50 flex-col items-center justify-center gap-2 p-4 text-center">
                      <span className="text-2xl">📄</span>
                      <span className="text-[10px] font-bold text-blue-600 underline">عرض وثيقة الهوية (PDF)</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-black py-1 px-3 translate-y-full group-hover:translate-y-0 transition-transform flex items-center justify-between">
                       <span>عرض مكبر 🔍</span>
                       <span>ID_VERIFIED ✅</span>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                   <span className="text-xl">🚫</span>
                   <p className="text-[10px] font-black text-rose-700 leading-tight">لم يتم إرفاق صورة الهوية مع هذا الطلب الرقمي.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2.5: Attachments (Supporting Documents) */}
          <div className="p-6 bg-slate-50/30 border-b border-slate-200">
             <h3 className="text-xs font-black text-slate-500 mb-4 uppercase tracking-wider flex items-center justify-between">
                <span>المرفقات ووثائق الإثبات ({attachments.length})</span>
                {attachments.length > 0 && <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">جاهزة للمراجعة</span>}
             </h3>
             
             {attachments.length > 0 ? (
               <div className="space-y-2">
                 {attachments.map((att: any, idx: number) => (
                   <a 
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                   >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800 leading-tight">{att.name || 'وثيقة مرفقة'}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1">اضغط للمعالجة والعرض 👁️</p>
                        </div>
                     </div>
                     <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">🔗</span>
                   </a>
                 ))}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center p-8 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <span className="text-3xl mb-2 opacity-30">📁</span>
                  <p className="text-[10px] font-bold text-slate-400">لا توجد مرفقات داعمة لهذا الطلب</p>
               </div>
             )}
          </div>

          {/* Section 3: Sticky Notes (Internal) */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-200">
             <h3 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-wider">مفكرة القاضي (Internal Audit Trail)</h3>
             <div className="space-y-2 mb-3">
                {stickyNotes.map((note, idx) => (
                  <div key={idx} className="bg-yellow-100 p-2.5 rounded-lg border-r-4 border-yellow-500 shadow-sm text-xs font-bold text-yellow-900 animate-slideIn">
                    📌 {note}
                  </div>
                ))}
             </div>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSticky}
                  onChange={(e) => setNewSticky(e.target.value)}
                  placeholder="إضافة ملاحظة داخلية..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && (setStickyNotes([...stickyNotes, newSticky]), setNewSticky(''))}
                />
                <button 
                  onClick={() => { if(newSticky) { setStickyNotes([...stickyNotes, newSticky]); setNewSticky(''); } }}
                  className="bg-slate-900 text-white px-3 py-1 rounded-xl text-lg font-bold"
                >
                  +
                </button>
             </div>
          </div>

          {/* Section 4: Decision Panel */}
          <div className="p-6 flex-1 bg-white">
            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center justify-between">
              <span>واجهة القرار القضائي (Decision Panel)</span>
              <span className="text-[10px] text-slate-400 font-normal">Step 4/6</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setDecisionType('approved')}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-4 transition-all ${
                  decisionType === 'approved' 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 scale-105 shadow-xl shadow-emerald-200/50' 
                  : 'border-slate-50 bg-slate-50 text-slate-400 grayscale hover:grayscale-0 hover:border-emerald-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-sm ${decisionType === 'approved' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-white'}`}>
                  ✓
                </div>
                <span className="font-black text-sm">الموافقــــــــة</span>
              </button>

              <button 
                onClick={() => setDecisionType('rejected')}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-4 transition-all ${
                  decisionType === 'rejected' 
                  ? 'border-rose-500 bg-rose-50 text-rose-900 scale-105 shadow-xl shadow-rose-200/50' 
                  : 'border-slate-50 bg-slate-50 text-slate-400 grayscale hover:grayscale-0 hover:border-rose-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-sm ${decisionType === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-white'}`}>
                  ✕
                </div>
                <span className="font-black text-sm">الــــــــرفض</span>
              </button>
            </div>

            {decisionType !== 'pending' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-tighter">تعليل القرار (Legal Reasoning)</label>
                  <textarea 
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    className="w-full h-48 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-xs font-bold leading-loose focus:bg-white focus:border-blue-500 transition-all outline-none"
                    placeholder="أدخل هنا تعليل القرار القضائي..."
                  />
                  
                  {/* Smart Highlighting for Third Party Template */}
                  {applicantStatus === 'third_party' && reasoning.includes('التيقن') && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full border border-blue-200">التيقن ✓</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full border border-blue-200">لا يمكن التوسع ✓</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full border border-blue-200">دون مساس بحقوق الغير ✓</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl space-y-3">
                   <button 
                    onClick={handleFinalSubmit}
                    disabled={recordDecisionMutation.isPending}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-lg rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     {recordDecisionMutation.isPending ? 'جاري الحفظ...' : (
                       <>
                         <span>🖋️</span>
                         <span>تأشير وتوقيع رقمي</span>
                       </>
                     )}
                   </button>

                   <button 
                    onClick={handleFinalSubmit}
                    disabled={recordDecisionMutation.isPending}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                   >
                     {recordDecisionMutation.isPending ? (
                       <span className="animate-pulse">جاري الإرسال...</span>
                     ) : (
                       <>
                         <span>📤</span>
                         <span>إرسال القرار إلى العدل صاحب الطلب</span>
                       </>
                     )}
                   </button>

                   <p className="text-[9px] text-blue-300 text-center mt-3 font-bold opacity-60">سيتم حفظ القرار في سجل التأشيرات القضائية وإبلاغ العدل آليا</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Document Preview & Annotation Layer */}
        <div className="flex-1 bg-slate-200 p-8 overflow-y-auto relative custom-scrollbar flex flex-col items-center">
          
          {/* Annotation Overlay Simulation */}
          <div className="w-full max-w-4xl relative">
            {decisionType === 'approved' && (
              <div className="absolute top-10 -right-20 w-64 z-50 transform rotate-12 opacity-90 animate-stampIn pointer-events-none">
                 <div className="border-4 border-emerald-600 p-4 bg-white/50 backdrop-blur-sm flex flex-col items-center text-emerald-800 rounded-lg">
                    <span className="font-extrabold text-lg border-b-2 border-emerald-600 w-full text-center pb-1">تأشيرة القاضي</span>
                    <span className="font-black my-2">موافق عليه</span>
                    <span className="text-[10px] opacity-75">رقم التحقق: {regNumber.split('-')[2]}</span>
                    <div className="mt-2 border-2 border-emerald-600 p-1">
                       <div className="w-12 h-12 bg-white flex items-center justify-center font-mono font-bold text-xs uppercase">QR CODE</div>
                    </div>
                 </div>
              </div>
            )}

            {decisionType === 'rejected' && (
              <div className="absolute top-20 -right-20 w-64 z-50 transform -rotate-12 opacity-90 animate-stampIn pointer-events-none">
                 <div className="border-4 border-rose-600 p-4 bg-white/50 backdrop-blur-sm flex flex-col items-center text-rose-800 rounded-lg">
                    <span className="font-extrabold text-lg border-b-2 border-rose-600 w-full text-center pb-1">قرار القاضي</span>
                    <span className="font-black my-2 text-2xl tracking-widest">مرفــــــــوض</span>
                    <span className="text-[10px] opacity-75">تاريخ البت: {new Date().toLocaleDateString('ar-MA')}</span>
                 </div>
              </div>
            )}

            <AdlCopyDocumentView 
              data={parsedData} 
              notaryData={{
                fullName: request.notary_name,
                jurisdiction: request.jurisdiction,
                professionalNumber: request.notary_professional_number
              }} 
              annotation={decisionType !== 'pending' ? {
                status: decisionType === 'approved' ? 'approved' : 'rejected',
                reasoning: reasoning,
                date: new Date().toLocaleDateString('ar-MA'),
                regNumber: regNumber,
                judgeName: 'قاضي التوثيق'
              } : undefined}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stampIn {
          0% { transform: scale(3) rotate(45deg); opacity: 0; }
          100% { transform: scale(1) rotate(12deg); opacity: 0.9; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
};
