import React, { useState, useMemo } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

// --- COURT MAPPINGS (Extracted from shared/courts.ts) ---
export const COURT_MAPPINGS = [
  {
    appellateCourt: "محكمة الاستئناف بالرباط",
    primaryCourts: ["المحكمة الابتدائية بالرباط", "المحكمة الابتدائية بسلا", "المحكمة الابتدائية بتمارة", "المحكمة الابتدائية بالخميسات", "المحكمة الابتدائية بتيفلت", "المحكمة الابتدائية بالرماني"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالقنيطرة",
    primaryCourts: ["المحكمة الابتدائية بالقنيطرة", "المحكمة الابتدائية بسيدي سليمان", "المحكمة الابتدائية بسوق الأربعاء", "المحكمة الابتدائية بسيدي قاسم", "المحكمة الابتدائية بمشرع بلقصيري"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالدار البيضاء",
    primaryCourts: ["المحكمة الابتدائية الزجرية بالدار البيضاء", "المحكمة الابتدائية بالمحمدية", "المحكمة الابتدائية ببنسليمان"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالجديدة",
    primaryCourts: ["المحكمة الابتدائية بالجديدة", "المحكمة الابتدائية بسيدي بنور", "المركز القضائي بأزمور", "المركز القضائي بأولاد فرج"]
  },
  {
    appellateCourt: "محكمة الاستئناف بسطات",
    primaryCourts: ["المحكمة الابتدائية بسطات", "المحكمة الابتدائية ببرشيد", "المحكمة الابتدائية بابن أحمد"]
  },
  {
    appellateCourt: "محكمة الاستئناف بفاس",
    primaryCourts: ["المحكمة الابتدائية بفاس", "المحكمة الابتدائية بصفرو", "المحكمة الابتدائية لبولمان بميسور", "المحكمة الابتدائية بتاونات", "المحكمة الابتدائية بقرية با محمد", "المركز القضائي ببولمان","المركز القضائي بأوطاط الحاج", "المركز القضائي بغفساي", "المركز القضائي بتيسة"]
  },
  {
    appellateCourt: "محكمة الاستئناف بتازة",
    primaryCourts: ["المحكمة الابتدائية بتازة", "المحكمة الابتدائية بجرسيف", "المركز القضائي واد أمليل", "المركز القضائي بتاهلة"]
  },
  {
    appellateCourt: "محكمة الاستئناف بمكناس",
    primaryCourts: ["المحكمة الابتدائية بمكناس", "المحكمة الابتدائية بآزرو"]
  },
  {
    appellateCourt: "محكمة الاستئناف بني ملال",
    primaryCourts: ["المحكمة الابتدائية بني ملال", "المحكمة الابتدائية بقصبة تادلة", "المحكمة الابتدائية بالفقيه بن صالح", "المحكمة الابتدائية سوق السبت", "المحكمة الابتدائية بأزيلال", "المحكمة الابتدائية بخنيفرة", "المركز القضائي بزاوية الشيخ", "المركز القضائي بأغبالة", "المركز القضائي بدار ولد زيدوح", "المركز القضائي بآيت اعتاب", "المركز القضائي بابزو", "المركز القضائي بدمنات", "المركز القضائي بأفورار", "المركز القضائي بواويزغت", "المركز القضائي بتاكلفت", "المركز القضائي بتيلوكيت", "المركز القضائي بالقباب"]
  },
  {
    appellateCourt: "محكمة الاستئناف بخريبكة",
    primaryCourts: ["المحكمة الابتدائية بخريبكة", "المحكمة الابتدائية بوادي زم", "المحكمة الابتدائية بأبي الجعد"]
  },
  {
    appellateCourt: "محكمة الاستئناف بمراكش",
    primaryCourts: ["المحكمة الابتدائية بمراكش", "المحكمة الابتدائية بامنتانوت", "المحكمة الابتدائية بقلعة السراغنة", "المحكمة الابتدائية بابن جرير", "المركز القضائي بأيت أورير", "المركز القضائي بأمزميز", "المركز القضائي بشيشاوة", "المركز القضائي بسيدي رحال"]
  },
  {
    appellateCourt: "محكمة الاستئناف بورزازات",
    primaryCourts: ["المحكمة الابتدائية بورزازات", "المحكمة الابتدائية بتنغير", "المحكمة الابتدائية بزاكورة", "المركز القضائي بقلعة مكونة", "المركز القضائي بأكدز"]
  },
  {
    appellateCourt: "محكمة الاستئناف بأكادير",
    primaryCourts: ["المحكمة الابتدائية بأكادير", "المحكمة الابتدائية بإنزكان", "المحكمة الابتدائية بتارودانت", "المحكمة الابتدائية بأولاد تايمة", "المحكمة الابتدائية بطاطا", "المحكمة الابتدائية بيوكرى", "المحكمة الابتدائية بتيزنيت"]
  },
  {
    appellateCourt: "محكمة الاستئناف بكلميم",
    primaryCourts: ["المحكمة الابتدائية بكلميم", "المحكمة الابتدائية بأسا الزاك", "المحكمة الابتدائية بطان طان", "المحكمة الابتدائية بسيدي إفني"]
  },
  {
    appellateCourt: "محكمة الاستئناف بأسفي",
    primaryCourts: ["المحكمة الابتدائية بآسفي", "المحكمة الابتدائية باليوسفية", "المحكمة الابتدائية بالصويرة", "المركز القضائي بجمعة اسحيم", "المركز القضائي بسبت كزولة"]
  },
  {
    appellateCourt: "محكمة الاستئناف بطنجة",
    primaryCourts: ["المحكمة الابتدائية بطنجة", "المحكمة الابتدائية بأصيلة", "المحكمة الابتدائية بالعرائش", "المحكمة الابتدائية بالقصر الكبير"]
  },
  {
    appellateCourt: "محكمة الاستئناف بتطوان",
    primaryCourts: ["المحكمة الابتدائية بتطوان", "المحكمة الابتدائية بشفشاون", "المحكمة الابتدائية بوزان"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالناظور",
    primaryCourts: ["المحكمة الابتدائية بالناظور", "المحكمة الابتدائية بالدريوش"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالحسيمة",
    primaryCourts: ["المحكمة الابتدائية بالحسيمة", "المحكمة الابتدائية بتارجيست"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالرشيدية",
    primaryCourts: ["المحكمة الابتدائية بالرشيدية", "المحكمة الابتدائية بميدلت", "المركز القضائي بأرفود", "المركز القضائي بالريصاني", "المركز القضائي بكلميمة", "المركز القضائي بالريش"]
  },
  {
    appellateCourt: "محكمة الاستئناف بوجدة",
    primaryCourts: ["المحكمة الابتدائية بوجدة", "المحكمة الابتدائية بجرادة", "المحكمة الابتدائية ببركان", "المحكمة الابتدائية لفجيج ببوعرفة", "المحكمة الابتدائية بتاوريرت"]
  },
  {
    appellateCourt: "محكمة الاستئناف بالعيون",
    primaryCourts: ["المحكمة الابتدائية بالعيون", "المحكمة الابتدائية بالسمارة", "المحكمة الابتدائية بالداخلة", "المركز القضائي بطرفاية", "المركز القضائي بيوجدور", "المركز القضائي ببئر كندوز"]
  }
];

// --- Types ---
interface Notary {
  id: string;
  full_name: string;
  cin: string | null;
  tax_id: string | null;
  dob: string | null;
  appointment_number: string | null;
  start_date: string | null;
  office_location: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  insurance_no: string | null;
  primary_court: string | null;
  court_name: string | null;
}

// --- Components ---

const StatItem = ({ label, value, icon, color }: { label: string, value: number, icon: string, color: string }) => (
  <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow`}>
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-xl`}>
      {icon}
    </div>
  </div>
);

const DigitalIDCard = ({ notary }: { notary: Notary }) => {
  return (
    <div className="relative w-full max-w-sm mx-auto h-[270px] bg-gradient-to-br from-red-900 via-red-800 to-red-950 rounded-2xl shadow-2xl overflow-hidden text-white p-5 border border-yellow-500/30 font-sans">
      <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">🏛️</div>
      <div className="absolute bottom-0 left-0 p-4 opacity-5 text-9xl">⚖️</div>

      <div className="flex justify-between items-start mb-4 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-red-900 font-bold text-xs shadow-lg">
            🇲🇦
          </div>
          <div>
            <h3 className="text-xs font-bold text-yellow-400 opacity-90 leading-tight">المملكة المغربية</h3>
            <p className="text-[9px] text-gray-300">الهيئة الوطنية للعدول</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">بطاقة مهنية رقمية</h2>
        </div>
      </div>

      <div className="flex gap-4 z-10 relative items-start">
        <div className="w-24 h-28 rounded-lg bg-gray-200 border-2 border-yellow-500 shadow-xl overflow-hidden flex-shrink-0">
          {notary.photo_url ? (
            <img src={notary.photo_url} alt={notary.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
              <span className="text-4xl opacity-50">👤</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-white leading-tight mb-0.5">{notary.full_name}</h1>
          <p className="text-[10px] text-yellow-500 font-semibold mb-2">{notary.primary_court || 'عدل ممارس'}</p>

          <div className="space-y-0.5 text-[8px] text-gray-300">
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span>الرقم المهني:</span>
              <span className="text-white font-mono">{notary.appointment_number || '---'}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span>رقم الرخصة:</span>
              <span className="text-white font-mono">{(notary as any).license_number || '---'}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span>رقم ب.ت.و:</span>
              <span className="text-white font-mono">{notary.cin || '---'}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span>الهاتف:</span>
              <span className="text-white font-mono" dir="ltr">{notary.phone || '---'}</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-0.5">
              <span>العنوان المهني:</span>
              <span className="text-white truncate max-w-[120px]">{notary.office_location || '---'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Verification footer */}
      <div className="absolute bottom-2 right-4 left-4 flex justify-between items-center opacity-60">
        <div className="text-[7px] font-mono text-gray-400">ID: {notary.id?.substring(0,8)}...</div>
        <div className="text-[7px] bg-green-500/20 text-green-400 px-1 rounded">VALIDATE</div>
      </div>
    </div>
  );
};

export const NotaryTechnicalCardPage = () => {
  const { user, notaryProfile } = useAuth();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [selectedNotary, setSelectedNotary] = useState<Notary | null>(null);
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);
  
  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cin: '',
    tax_id: '',
    insurance_no: '',
    appointment_number: '',
    start_date: '',
    dob: '',
    primary_court: '',
    office_location: '',
    password: ''
  });

  const utils = trpc.useContext();
  const createMutation = trpc.notaries.createAccount.useMutation({
    onSuccess: () => {
      utils.notaries.list.invalidate();
      setIsModalOpen(false);
      resetForm();
      alert('تم إضافة العدل بنجاح ✅');
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const updateMutation = trpc.notaries.updateProfile.useMutation({
    onSuccess: () => {
      utils.notaries.list.invalidate();
      setIsModalOpen(false);
      resetForm();
      alert('تم تحديث البيانات بنجاح ✅');
    },
    onError: (err) => alert(`خطأ: ${err.message}`)
  });

  const resetForm = () => {
    setFormData({
      full_name: '', email: '', phone: '', cin: '', tax_id: '', insurance_no: '', appointment_number: '', start_date: '', dob: '', primary_court: '', office_location: '', password: ''
    });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (notary: Notary) => {
    setFormData({
      full_name: notary.full_name,
      email: notary.email || '',
      phone: notary.phone || '',
      cin: notary.cin || '',
      tax_id: notary.tax_id || '',
      insurance_no: notary.insurance_no || '',
      dob: notary.dob || '',
      primary_court: notary.primary_court || '',
      appointment_number: notary.appointment_number || '',
      start_date: notary.start_date || '',
      office_location: notary.office_location || '',
      password: '' // Don't fill password on edit
    });
    setEditingId(notary.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentRegion) {
        alert('خطأ: لم يتم التعرف على المجلس الجهوي');
        return;
    }

    if (isEditMode && editingId) {
      updateMutation.mutate({
        id: editingId,
        full_name: formData.full_name,
        phone: formData.phone,
        cin: formData.cin,
        tax_id: formData.tax_id || undefined,
        insurance_no: formData.insurance_no || undefined,
        dob: formData.dob,
        office_location: formData.office_location,
        appointment_number: formData.appointment_number,
        start_date: formData.start_date,
        primary_court: formData.primary_court,
        appellate_court: currentRegion.appellateCourt
      });
    } else {
      createMutation.mutate({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        cin: formData.cin,
        tax_id: formData.tax_id || undefined,
        insurance_no: formData.insurance_no || undefined,
        dob: formData.dob,
        office_location: formData.office_location,
        appointment_number: formData.appointment_number,
        start_date: formData.start_date,
        primary_court: formData.primary_court,
        region: currentRegion.appellateCourt
      });
    }
  };

  // --- Determine Regional Context ---
  // Extract Appellate Court from User (assuming Regional Admin user or Notary)
  // Logic: Matches user.full_name against known Appellate Courts OR uses Notary Profile
  const currentRegion = useMemo(() => {
    // 0. Priority: From Notary Profile
    if (notaryProfile?.appellate_court) {
        const match = COURT_MAPPINGS.find(m => m.appellateCourt === notaryProfile.appellate_court);
        if (match) return match;
    }

    if (!user?.full_name) return null;
    
    // Normalize string for matching
    const normalizedName = user.full_name.trim();

    // 1. Direct match in local mappings
    const directMatch = COURT_MAPPINGS.find(m => normalizedName.includes(m.appellateCourt));
    if (directMatch) return directMatch;

    // 2. Fuzzy match by city name (e.g. "المجلس الجهوي الرباط" -> matches "الرباط")
    const fuzzyMatch = COURT_MAPPINGS.find(m => {
       // Extract city from "محكمة الاستئناف ب[CITY]"
       const city = m.appellateCourt.replace('محكمة الاستئناف ', '').replace('ب', '');
       return normalizedName.includes(city);
    });

    return fuzzyMatch || null;
  }, [user]);

  // Fetch real data (Filtered by Region)
  // We pass the appellate court name to the backend query to filter initially
  const { data: rawNotaries, isLoading, error } = trpc.notaries.list.useQuery({ 
      search: search,
      court: currentRegion?.appellateCourt // Filters by region/appellate court
  });

  // Client-side strict filtering for Primary Courts
  // Ensures displayed adouls belong ONLY to primary courts of this region
  const notaries = useMemo(() => {
     if (!rawNotaries) return [];
     if (!currentRegion) return rawNotaries; // If no region detected (e.g. Super Admin), show all
     
     return rawNotaries.filter(n => {
        // If notary has a primary court assigned, check if it's in the allowed list
        let isValidRegion = true;
        
        if (n.primary_court) {
           isValidRegion = currentRegion.primaryCourts.some(pc => n.primary_court === pc || n.primary_court?.includes(pc));
        }

        // Apply Primary Court Selection Filter
        if (selectedPrimaryCourt && n.primary_court !== selectedPrimaryCourt) {
           return false;
        }

        return isValidRegion;
     });
  }, [rawNotaries, currentRegion, selectedPrimaryCourt]);

  const stats = useMemo(() => {
    if (!notaries) return { total: 0, active: 0, new: 0 };
    return {
      total: notaries.length,
      active: notaries.filter(n => n.email).length, // Mock logic for active
      new: notaries.filter(n => Math.random() > 0.8).length // Mock logic for new (since no created_at in result)
    };
  }, [notaries]);

   // Split Name Utility
  const getNameParts = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin text-4xl text-emerald-600">⌛</div>
        <span className="mr-3 text-lg font-medium text-gray-600">جاري تحميل بيانات العدول...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
        <p className="font-bold">حدث خطأ أثناء تحميل البيانات</p>
        <p className="text-sm mt-2">{error.message}</p>
      </div>
    );
  }

  const notaryList = notaries || [];

  return (
    <div className="space-y-8 animate-fade-in p-2 md:p-6 max-w-[1600px] mx-auto">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl bg-amber-100 p-2 rounded-lg">📜</span>
              <h2 className="text-2xl font-bold text-gray-800 font-kufi">البطاقة التقنية للسادة العدول</h2>
           </div>
           <p className="text-gray-500 max-w-xl leading-relaxed">
             قاعدة بيانات شاملة وتفاعلية للعدول المنتسبين للمجلس الجهوي، تتضمن المعلومات المهنية والشخصية المحدثة.
           </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <StatItem label="مجموع العدول" value={stats.total} icon="👥" color="bg-blue-100 text-blue-600" />
          <StatItem label="في حالة مزاولة" value={stats.active} icon="✅" color="bg-emerald-100 text-emerald-600" />
          <StatItem label="التحاق جديد" value={stats.new} icon="✨" color="bg-purple-100 text-purple-600" />
        </div>
      </div>

      {/* Jurisdiction Banner */}
      {currentRegion && (
        <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in-up">
           <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm text-2xl">🏛️</div>
              <div>
                 <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                   نطاق الاختصاص القضائي: <span className="text-indigo-700 underline">{currentRegion.appellateCourt}</span>
                 </h4>
                 <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setSelectedPrimaryCourt(null)}
                      className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                        selectedPrimaryCourt === null
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                          : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 border-dashed'
                      }`}
                    >
                      الكل 🏢
                    </button>
                    {currentRegion.primaryCourts.map(court => (
                      <button
                        key={court}
                        onClick={() => setSelectedPrimaryCourt(court === selectedPrimaryCourt ? null : court)}
                        className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                          selectedPrimaryCourt === court
                           ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' 
                           : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {court}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-20">
        <div className="flex gap-4 w-full md:w-auto">
             {/* Search */}
            <div className="relative w-full md:w-80 group">
              <input 
                type="text" 
                placeholder="بحث بالاسم، الهاتف، أو المدينة..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                🔍
              </span>
            </div>
            
            {/* Add Button */}
            <button 
               onClick={handleOpenCreate}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
            >
               <span>➕</span>
               <span className="hidden md:inline">إضافة عدل</span>
            </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📋 جدول
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'cards' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🪪 بطاقات
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'table' ? (
         <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/50 overflow-hidden border border-gray-100">
         <div className="overflow-x-auto">
           <table className="w-full text-right text-sm">
             <thead className="bg-[#f8f5f1] text-gray-700 font-bold border-b border-[#e6be8a]/30">
               <tr>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 w-16 text-center">الترتيب</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 w-16 text-center">الصورة</th>
                 <th colSpan={2} className="p-4 border-l border-gray-200/50 text-center bg-[#f0e9dd]">اسم العدل</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[100px]">رقم ب.ت.و</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[140px]">رقم التعريف الضريبي</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[140px]">رقم التأمين</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[120px]">تاريخ الازدياد</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[140px]">الرقم المهني</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[140px]">تاريخ التعيين</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[120px]">الهاتف</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[200px]">البريد الإلكتروني</th>
                 <th rowSpan={2} className="p-4 border-l border-gray-200/50 min-w-[200px]">العنوان الحالي</th>
                 <th rowSpan={2} className="p-4 text-center min-w-[100px]">إجراءات</th>
               </tr>
               <tr>
                 <th className="p-3 border-l border-t border-gray-200/50 bg-white/50 text-emerald-800">الشخصي</th>
                 <th className="p-3 border-t border-gray-200/50 bg-white/50 text-emerald-800">العائلي</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {notaryList.map((notary, index) => {
                 const { first, last } = getNameParts(notary.full_name);
                 return (
                   <tr key={notary.id} className="group hover:bg-amber-50/30 transition-colors duration-200">
                     <td className="p-4 text-center font-mono text-gray-400 group-hover:text-amber-600 font-bold">{index + 1}</td>
                     <td className="p-2 text-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm mx-auto">
                          {notary.photo_url ? (
                            <img src={notary.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">👤</div>
                          )}
                        </div>
                     </td>
                     <td className="p-4 font-medium text-gray-900 bg-white/30">{first}</td>
                     <td className="p-4 font-medium text-gray-900 bg-white/30">{last}</td>
                     <td className="p-4 text-center font-mono text-sm text-gray-600">{notary.cin || '-'}</td>
                     <td className="p-4 text-center font-mono text-sm text-gray-600" dir="ltr">{notary.tax_id || '-'}</td>
                     <td className="p-4 text-center font-mono text-sm text-gray-600" dir="ltr">{notary.insurance_no || '-'}</td>
                     <td className="p-4 text-center font-mono text-sm text-gray-600" dir="ltr">{notary.dob || '-'}</td>
                     <td className="p-4 text-center">
                       {notary.appointment_number ? (
                         <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono border border-gray-200">
                           {notary.appointment_number}
                         </span>
                       ) : <span className="text-gray-300">-</span>}
                     </td>
                     <td className="p-4 text-center font-mono text-sm text-gray-600" dir="ltr">{notary.start_date || '-'}</td>
                     <td className="p-4 font-mono text-gray-600 text-sm" dir="ltr">{notary.phone || '-'}</td>
                     <td className="p-4 text-blue-600 text-xs max-w-[150px] truncate hover:underline cursor-pointer" title={notary.email || ''}>{notary.email}</td>
                     <td className="p-4 text-gray-500 text-xs max-w-[200px] truncate" title={notary.office_location || ''}>{notary.office_location}</td>
                     <td className="p-4 text-center">
                       <div className="flex justify-center gap-2">
                         <button 
                           onClick={() => setSelectedNotary(notary)}
                           className="bg-[#782428] hover:bg-[#912d32] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                         >
                           <span>👁️</span> عرض
                         </button>
                         <button 
                           onClick={() => handleOpenEdit(notary)}
                           className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                         >
                           ✏️
                         </button>
                       </div>
                     </td>
                   </tr>
                 );
               })}
               {notaryList.length === 0 && (
                 <tr>
                   <td colSpan={14} className="p-12 text-center text-gray-400 flex flex-col items-center">
                      <span className="text-4xl mb-2">🔍</span>
                      <span>لا توجد نتائج مطابقة للبحث</span>
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {notaryList.map((notary) => (
             <div key={notary.id} className="group relative perspective-1000 flex flex-col items-center">
                <div onClick={() => setSelectedNotary(notary)} className="cursor-pointer transform group-hover:-translate-y-2 transition-transform duration-300 w-full">
                   <DigitalIDCard notary={notary} />
                </div>
                {/* Actions */}
                <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                     <button 
                       onClick={() => handleOpenEdit(notary)}
                       className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-200 transition-all shadow-sm"
                     >
                       تعديل ✏️
                     </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative transform transition-all animate-fade-in-up z-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditMode ? 'تعديل بيانات العدل' : 'إضافة عدل جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (للدخول)</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    dir="ltr"
                  />
                </div>
              )}

              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم المهني</label>
                  <input 
                    type="text" 
                    value={formData.appointment_number}
                    onChange={e => setFormData({...formData, appointment_number: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                  <input 
                    type="date" 
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الازدياد</label>
                  <input 
                    type="date" 
                    value={formData.dob}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم ب.ت.و (CIN)</label>
                <input 
                  type="text" 
                  value={formData.cin}
                  onChange={e => setFormData({...formData, cin: e.target.value})}
                  placeholder="مثال: AB123456"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم التعريف الضريبي</label>
                <input 
                  type="text" 
                  value={formData.tax_id}
                  onChange={e => setFormData({...formData, tax_id: e.target.value})}
                  placeholder="مثال: 12345678"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم التأمين المهني</label>
                <input 
                  type="text" 
                  value={formData.insurance_no}
                  onChange={e => setFormData({...formData, insurance_no: e.target.value})}
                  placeholder="رقم عقد التأمين..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المحكمة الابتدائية</label>
                <select
                  required
                  value={formData.primary_court}
                  onChange={e => setFormData({...formData, primary_court: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                >
                  <option value="">اختر المحكمة...</option>
                  {currentRegion?.primaryCourts.map(court => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المكتب</label>
                <textarea 
                  rows={2}
                  value={formData.office_location}
                  onChange={e => setFormData({...formData, office_location: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                >
                   {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ البيانات'} 
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedNotary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedNotary(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 animate-scale-in flex flex-col md:flex-row">
             
             {/* Left Side (Visuals) */}
             <div className="w-full md:w-1/3 bg-gray-50 border-l border-gray-100 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-red-900 to-red-800 opacity-10"></div>
                <div className="relative z-10">
                   <div className="w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden mb-6 mx-auto">
                     {selectedNotary.photo_url ? (
                        <img src={selectedNotary.photo_url} alt="" className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-5xl text-gray-400">👤</div>
                     )}
                   </div>
                   <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">{selectedNotary.full_name}</h2>
                   <p className="text-emerald-700 font-medium text-center bg-emerald-50 px-3 py-1 rounded-full text-sm inline-block mx-auto w-full">
                      {selectedNotary.appointment_number ? `الرقم المهني: ${selectedNotary.appointment_number}` : 'موثق عصري'}
                   </p>
                </div>
                
                <div className="mt-12 w-full">
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">بطاقة رقمية</h4>
                      <div className="transform scale-[0.6] origin-top-right -ml-10">
                         <DigitalIDCard notary={selectedNotary} />
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Side (Details) */}
             <div className="w-full md:w-2/3 p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-xl font-bold text-gray-800">تفاصيل الملف المهني</h3>
                      <p className="text-gray-500 text-sm">آخر تحديث للبيانات: 2024/01/15</p>
                   </div>
                   <button onClick={() => setSelectedNotary(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                      ✕
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-red-900 border-b border-red-100 pb-2">معلومات شخصية</h4>
                      <DetailRow label="الاسم الشخصي" value={getNameParts(selectedNotary.full_name).first} />
                      <DetailRow label="الاسم العائلي" value={getNameParts(selectedNotary.full_name).last} />
                      <DetailRow label="تاريخ الازدياد" value={selectedNotary.dob || 'غير متوفر'} isPlaceholder={!selectedNotary.dob} />
                      <DetailRow label="رقم ب.ت.و" value={selectedNotary.cin || 'غير متوفر'} isPlaceholder={!selectedNotary.cin} />
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-2">معلومات الاتصال</h4>
                      <DetailRow label="الهاتف" value={selectedNotary.phone} dir="ltr" />
                      <DetailRow label="البريد الإلكتروني" value={selectedNotary.email} className="truncate" />
                      <DetailRow label="العنوان" value={selectedNotary.office_location} className="text-xs" />
                   </div>

                   <div className="space-y-4 md:col-span-2">
                       <h4 className="text-sm font-bold text-amber-800 border-b border-amber-100 pb-2">المعطيات المهنية</h4>
                       <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                          <DetailRow label="تاريخ التعيين" value={selectedNotary.start_date || 'غير متوفر'} isPlaceholder={!selectedNotary.start_date} />
                          <DetailRow label="الرقم المهني" value={selectedNotary.appointment_number || 'غير متوفر'} isPlaceholder={!selectedNotary.appointment_number} />
                          <DetailRow label="رقم الرخصة" value={(selectedNotary as any).license_number || 'غير متوفر'} isPlaceholder={!(selectedNotary as any).license_number} />
                          <DetailRow label="مقر المحكمة" value={selectedNotary.primary_court} />
                          <DetailRow label="الدائرة الاستئنافية" value={selectedNotary.region} />
                         <DetailRow label="رقم التعريف الضريبي" value={selectedNotary.tax_id || 'غير متوفر'} isPlaceholder={!selectedNotary.tax_id} />
                         <DetailRow label="رقم التأمين" value={selectedNotary.insurance_no || 'غير متوفر'} isPlaceholder={!selectedNotary.insurance_no} />
                       </div>
                   </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                   <button className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                      طباعة البطاقة
                   </button>
                   <button className="px-6 py-2.5 rounded-lg bg-red-900 text-white font-bold hover:bg-red-950 transition-colors shadow-lg shadow-red-900/20">
                      تحميل الملف PDF
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for Detail Row
const DetailRow = ({ label, value, isPlaceholder, dir, className = '' }: any) => (
  <div>
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`font-semibold text-gray-800 ${isPlaceholder ? 'text-gray-300 italic text-sm' : ''} ${className}`} dir={dir}>
      {value || '---'}
    </p>
  </div>
);
