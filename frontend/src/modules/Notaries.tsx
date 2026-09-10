import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notarySchema, type Notary } from '../../../shared/schemas';
import { COURT_MAPPINGS } from '../../../shared/courts';
import { trpc } from '../trpc';
import { GoogleMapSelector, CITY_POINTS } from '../components/GoogleMapSelector';
import { ReturnToLandingButton } from '../components/common/ReturnToLandingButton';

const CITY_MAPPINGS: Record<string, string> = {
  'tetouan': 'تطوان',
  'tangier': 'طنجة',
  'chefchaouen': 'شفشاون',
  'chaouen': 'شفشاون',
  'rabat': 'الرباط',
  'casablanca': 'الدار البيضاء',
  'fez': 'فاس',
  'marrakech': 'مراكش',
  'agadir': 'أكادير',
  'meknes': 'مكناس',
  'oujda': 'وجدة',
  'kenitra': 'القنيطرة',
  'sale': 'سلا',
  'nador': 'الناظور',
  'safi': 'آسفي',
  'mohammedia': 'المحمدية',
  'el jadida': 'الجديدة',
  'beni mellal': 'بني ملال',
  'errachidia': 'الرشيدية',
  'laayoune': 'العيون',
  'dakhla': 'الداخلة',
  'taza': 'تازة',
  'settat': 'سطات',
  'larache': 'العرائش',
  'khemisset': 'الخميسات',
  'guelmim': 'كلميم',
  'berrechid': 'برشيد',
  'khouribga': 'خريبكة',
  'temara': 'تمارة'
};

const ADDITIONAL_CITY_KEYWORDS: Record<string, string[]> = {
  'الرباط': ['rabat'],
  'الدار البيضاء': ['casablanca', 'casa'],
  'طنجة': ['tangier', 'tanger'],
  'شفشاون': ['chefchaouen', 'chaouen'],
  'تطوان': ['tetouan', 'tetuan', 'tétouan'],
  'فاس': ['fez', 'fes'],
  'مكناس': ['meknes', 'meknès'],
  'مراكش': ['marrakech', 'marrakesh'],
  'أكادير': ['agadir'],
  'وجدة': ['oujda'],
  'الصويرة': ['essaouira', 'mogador'],
  'الناظور': ['nador'],
  'العيون': ['laayoune', 'layoune'],
  'الداخلة': ['dakhla'],
  'كلميم': ['guelmim', 'guelmin'],
  'بني ملال': ['beni mellal', 'beni-mellal'],
  'الرشيدية': ['errachidia'],
  'القنيطرة': ['kenitra', 'kénitra'],
  'سلا': ['sale', 'salé'],
};

const CITY_KEYWORDS = (() => {
  const englishGroups = Object.entries(CITY_MAPPINGS).reduce<Record<string, string[]>>((acc, [english, arabic]) => {
    const normalizedEnglish = english.toLowerCase();
    if (!acc[arabic]) acc[arabic] = [];
    acc[arabic].push(normalizedEnglish);
    return acc;
  }, {});

  return CITY_POINTS.map((city) => {
    const englishSynonyms = englishGroups[city.label] ?? [];
    const extras = ADDITIONAL_CITY_KEYWORDS[city.label] ?? [];
    const keywords = new Set<string>([city.label.toLowerCase(), ...englishSynonyms, ...extras.map((keyword) => keyword.toLowerCase())]);
    return {
      label: city.label,
      keywords: Array.from(keywords),
    };
  });
})();

const detectCityName = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const match = CITY_KEYWORDS.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.label ?? null;
};

const resolveCityForNotary = (notary: any) =>
  detectCityName(notary?.primary_court) ??
  detectCityName(notary?.court_name) ??
  detectCityName(notary?.office_location) ??
  detectCityName(notary?.region);

export function NotariesModule() {
  const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');

  return (
    <div className="space-y-6">
      <ReturnToLandingButton />
      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'search'
              ? 'border-b-2 border-[#381210] text-[#381210]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔍 البحث عن عدل
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'manage'
              ? 'border-b-2 border-[#381210] text-[#381210]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 إدارة القائمة
        </button>
      </div>

      {/* Content */}
      {activeTab === 'search' ? <NotarySearch /> : <NotaryManagement />}
    </div>
  );
}


function NotarySearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useState({
    location: '',
    name: '',
    court: '',
    electronic: false,
  });

  const [selectedAppellate, setSelectedAppellate] = useState('');
  const [selectedPrimary, setSelectedPrimary] = useState('');

  const primaryOptions = useMemo(() => {
    return COURT_MAPPINGS.find(c => c.appellateCourt === selectedAppellate)?.primaryCourts || [];
  }, [selectedAppellate]);



  const [activeFilters, setActiveFilters] = useState(searchParams);

  const { data: notaries, isLoading } = trpc.notaries.list.useQuery({
    name: activeFilters.name,
    location: activeFilters.location,
    court: activeFilters.court,
    electronic: activeFilters.electronic
  });

  const filteredNotaries = notaries || [];
  const cityCounts = useMemo(() => {
    if (!filteredNotaries.length) return [];
    const counts: Record<string, number> = {};
    filteredNotaries.forEach((notary) => {
      const cityName = resolveCityForNotary(notary);
      if (cityName) {
        counts[cityName] = (counts[cityName] ?? 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));
  }, [filteredNotaries]);

  const handleSearch = () => {
    let locationToSearch = searchParams.location;
    const lowerLoc = locationToSearch.toLowerCase().trim();
    
    if (CITY_MAPPINGS[lowerLoc]) {
        locationToSearch = CITY_MAPPINGS[lowerLoc];
    }
    
    const newParams = {
        ...searchParams,
        location: locationToSearch
    };

    setSearchParams(newParams);
    setActiveFilters(newParams);
  };

  const goToSocietyMembersLogin = () => {
    const nextSearch = new URLSearchParams(location.search);
    if (location.pathname !== '/directory') {
      nextSearch.set('module', 'notaries');
    }
    const search = nextSearch.toString();
    const from = `${location.pathname}${search ? `?${search}` : ''}${location.hash ?? ''}`;
    navigate('/society-members', { state: { from } });
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#f7f4ef] rounded-3xl shadow-lg border border-[#e6dfcd] overflow-hidden">
      {/* Top info bar */}
      <div className="bg-[#381210] text-white text-xs md:text-sm px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <span className="font-maghribi font-bold text-base">الهيئة الوطنية للعدول بالمغرب</span>
        <div className="flex items-center gap-2 text-white/80">
          <span>مركز الاتصال: 05 37 77 88 00</span>
          <span className="hidden md:inline">|</span>
          <span>البريد: support@adoul.ma</span>
        </div>
      </div>


      {/* Navigation */}
      <div className="bg-[#381210] text-white px-6 md:px-12 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logos/adoul-logo.jpg" alt="شعار الهيئة" className="w-12 h-12 rounded-full border border-white/30 object-cover" />
          <div>
            <h1 className="text-3xl font-black font-maghribi">الهيئة الوطنية للعدول</h1>
          </div>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          {['من نحن', 'بحث عن عدل', 'الخدمات الإلكترونية', 'الأخبار', 'النصوص القانونية', 'دليل العدول', 'اتصل بنا'].map((item) => (
            <button key={item} className="hover:text-yellow-300 transition-colors">
              {item}
            </button>
          ))}
        </nav>
          <div className="flex flex-col gap-2 text-sm text-white">
            <button className="self-start md:self-auto bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full border border-white/30">
              فضاء العدول
            </button>
          <button
            type="button"
            onClick={goToSocietyMembersLogin}
            className="self-start md:self-auto text-xs underline tracking-[0.4em] uppercase text-yellow-200 hover:text-white"
          >
            Society Members Login
          </button>
          </div>
      </div>

      {/* Crest + search */}
      <div className="px-6 md:px-12 py-12 bg-gradient-to-b from-white/90 via-white to-transparent">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="flex flex-col items-center text-center gap-6">
            <img
              src="/logos/morocco-coat.jpg"
              alt="شعار المملكة المغربية"
              className="w-40 h-40 object-contain drop-shadow-2xl"
            />
            <div>
              <h2 className="text-3xl font-serif text-[#381210] font-bold mt-2">الهيئة الوطنية للعدول</h2>
            </div>
            <p className="text-gray-600 leading-7 max-w-md">
              الهيئة الوطنية للعدول هي المؤسسة الممثلة لمهنة العدول بالمغرب، وتسهر على تنظيم المهنة وضمان حقوق العدول والمواطنين على حد سواء، مع الالتزام بالضوابط الشرعية والقانونية.
            </p>

            <div className="w-full max-w-md mt-8 bg-white/50 p-4 rounded-2xl border border-[#e6dfcd]">
               <h3 className="text-lg font-bold text-[#381210] mb-4">اختر الموقع من الخريطة</h3>
               <GoogleMapSelector 
                 onLocationSelect={(loc) => setSearchParams({ ...searchParams, location: loc })} 
                 cityCounts={cityCounts}
               />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#d6d0bf] shadow-2xl p-8 space-y-6">
            <div className="border-b border-[#e8e1cf] pb-4">
              <p className="text-xs uppercase tracking-[0.35em] text-[#381210]/70">FIND A NOTARY</p>
              <h3 className="text-2xl font-bold text-[#381210]">بحث عن عدل</h3>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-[#381210]">البحث حسب الموقع</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="المدينة أو الإقليم"
                  className="flex-1 rounded-lg border border-[#c5bfac] p-3 focus:ring-2 focus:ring-[#381210]/30 outline-none"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                />
                <select className="w-32 rounded-lg border border-[#c5bfac] p-3 bg-[#f9f7f1] text-gray-600">
                  <option>10 كم</option>
                  <option>25 كم</option>
                  <option>50 كم</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">
                البحث الافتراضي في نطاق 10 كم. يمكنك توسيع النطاق للعثور على عدول في مناطق أبعد.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-[#381210]">البحث بالمحكمة</label>
              <div className="space-y-2">
                <select
                  className="w-full rounded-lg border border-[#c5bfac] p-3 focus:ring-2 focus:ring-[#381210]/30 outline-none bg-white"
                  value={selectedAppellate}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSelectedAppellate(newVal);
                    setSelectedPrimary('');
                    setSearchParams({ ...searchParams, court: newVal });
                  }}
                >
                  <option value="">اختر محكمة الاستئناف</option>
                  {COURT_MAPPINGS.map((mapping) => (
                    <option key={mapping.appellateCourt} value={mapping.appellateCourt}>
                      {mapping.appellateCourt}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full rounded-lg border border-[#c5bfac] p-3 focus:ring-2 focus:ring-[#381210]/30 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  value={selectedPrimary}
                  disabled={!selectedAppellate}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSelectedPrimary(newVal);
                    setSearchParams({ ...searchParams, court: newVal || selectedAppellate });
                  }}
                >
                  <option value="">اختر المحكمة الابتدائية (اختياري)</option>
                  {primaryOptions.map((court) => (
                    <option key={court} value={court}>
                      {court}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-[#381210]">البحث باسم العدل</label>
              <input
                type="text"
                placeholder="الاسم الكامل أو النسب"
                className="w-full rounded-lg border border-[#c5bfac] p-3 focus:ring-2 focus:ring-[#381210]/30 outline-none"
                value={searchParams.name}
                onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#c5bfac] text-[#381210] focus:ring-[#381210]/40"
                checked={searchParams.electronic}
                onChange={(e) => setSearchParams({ ...searchParams, electronic: e.target.checked })}
              />
              <span>يقبل المعاملات الإلكترونية</span>
            </label>

            <div className="flex gap-3 flex-wrap text-xs text-[#381210]">
              <button className="underline hover:text-[#c37a1f] transition-colors">بحث متقدم</button>
              <span>|</span>
              <span className="font-semibold">شروط الاستخدام والخصوصية</span>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full bg-[#381210] hover:bg-[#260c0b] text-white rounded-lg py-3 font-semibold shadow-lg transition-colors"
            >
              {isLoading ? 'جاري البحث...' : 'بحث الآن'}
            </button>
          </div>
        </div>
      </div>
      <div className="text-center">
        <button
          onClick={goToSocietyMembersLogin}
          className="inline-flex items-center justify-center rounded-full border border-[#d8c9a7] bg-white px-6 py-3 text-sm font-semibold text-[#1f2a44] shadow hover:bg-[#f9f4e8]"
        >
          الانتقال إلى تسجيل دخول أعضاء الهيئة
        </button>
      </div>
    </div>

      {/* Results */}
      <div className="bg-white px-6 md:px-12 py-10 border-t border-[#e6dfcd]">
        <div className="mb-8">
          <h4 className="text-3xl font-serif text-[#381210]">
            وجدنا <span className="text-[#c53030] font-bold">{filteredNotaries?.length ?? 0} عدول</span>
          </h4>
        </div>

        <div className="space-y-6">
          {filteredNotaries?.map((notary, index) => (
            <div key={notary.id} className="flex gap-4">
              {/* Number Marker or Profile Picture */}
              <div className="hidden md:flex flex-col items-center w-20 pt-6 flex-shrink-0">
                {notary.photo_url ? (
                  <img 
                    src={notary.photo_url} 
                    alt={notary.full_name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#c53030] shadow-md bg-white"
                  />
                ) : (
                  <div className="relative bg-[#4a5568] p-1.5 shadow-md">
                    <div className="bg-[#c53030] text-white font-serif w-8 h-8 flex items-center justify-center text-xl shadow-inner">
                      {index + 1}
                    </div>
                    {/* Triangle pointer */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#4a5568]"></div>
                  </div>
                )}
              </div>

              {/* Content Card */}
              <div className="flex-1 bg-[#efebe6] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <h5 className="text-xl font-bold text-[#381210]">{notary.full_name}</h5>
                  
                  <div className="text-gray-700 space-y-1.5 text-sm font-medium">
                    {notary.phone && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#381210] w-6">T:</span>
                        <span dir="ltr">{notary.phone}</span>
                      </div>
                    )}
                    
                    {notary.email && (
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-[#381210] w-6">@:</span>
                         <span>{notary.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-[#381210] w-6">📍:</span>
                       <span>{notary.office_location || notary.region}</span>
                    </div>

                    {notary.primary_court && (
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-[#381210] w-6">⚖️:</span>
                         <span>{notary.primary_court}</span>
                      </div>
                    )}

                    {(notary as any).electronic && (
                      <div className="pt-2 text-xs italic text-gray-500">
                        Electronic notarisation offered
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 md:mt-auto self-end">
                  <button 
                    onClick={() => navigate(`/directory/${notary.id}`)}
                    className="bg-[#381210] hover:bg-[#260c0b] text-white px-6 py-2 rounded text-sm font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2"
                  >
                    عرض التفاصيل ▼
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!filteredNotaries || filteredNotaries.length === 0) && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-[#d5ccb6] bg-[#fdfbf4] text-gray-500">
              <p className="text-lg font-semibold mb-2">لا توجد نتائج تطابق بحثك</p>
              <p className="text-sm max-w-2xl mx-auto">
                حاول تغيير معايير البحث أو توسيع النطاق الجغرافي للعثور على المزيد من النتائج.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function NotaryManagement() {
  const utils = trpc.useUtils();
  const { data: notaries } = trpc.notaries.list.useQuery();
  const create = trpc.notaries.create.useMutation({ onSuccess: () => utils.notaries.list.invalidate() });
  const update = trpc.notaries.update.useMutation({ onSuccess: () => utils.notaries.list.invalidate() });
  const remove = trpc.notaries.delete.useMutation({ onSuccess: () => utils.notaries.list.invalidate() });

  const { register, handleSubmit, reset } = useForm<Notary>({ resolver: zodResolver(notarySchema) });

  const onSubmit = handleSubmit((values) => {
    if (values.id) {
      update.mutate(values);
    } else {
      create.mutate(values, { onSuccess: () => reset() });
    }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">أسماء العدول</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input className="input" placeholder="الاسم الكامل" {...register('full_name')} />
          <input className="input" placeholder="رقم البطاقة الوطنية" {...register('cin')} />
          <input className="input" placeholder="رقم التعيين" {...register('appointment_number')} />
          <input className="input" placeholder="تاريخ بداية العمل" type="date" {...register('start_date')} />
          <input className="input" placeholder="مركز العمل / المحكمة" {...register('office_location')} />
          <input className="input" placeholder="الإقليم / العمالة" {...register('region')} />
          <input className="input" placeholder="الهاتف" {...register('phone')} />
          <input className="input" placeholder="البريد الإلكتروني" {...register('email')} />
          <input className="input" placeholder="رابط الصورة (اختياري)" {...register('photo_url')} />
          <div className="md:col-span-3 flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => reset()}>
              جديد
            </button>
            <button className="btn-primary" type="submit">
              {create.isPending || update.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-2 text-base font-semibold">قائمة العدول</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm rtl:text-right">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2">الاسم الكامل</th>
                <th className="p-2">CIN</th>
                <th className="p-2">الإقليم / العمالة</th>
                <th className="p-2">الهاتف</th>
                <th className="p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {notaries?.map((n) => (
                <tr key={n.id} className="border-b">
                  <td className="p-2">{n.full_name}</td>
                  <td className="p-2">{n.cin}</td>
                  <td className="p-2">{n.region}</td>
                  <td className="p-2">{n.phone}</td>
                  <td className="p-2 flex gap-2">
                    <button className="btn-secondary" onClick={() => reset(n)}>
                      تعديل
                    </button>
                    <button className="btn-danger" onClick={() => remove.mutate({ id: n.id! })}>
                      حذف
                    </button>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td className="p-2" colSpan={5}>
                    لا توجد بيانات مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


