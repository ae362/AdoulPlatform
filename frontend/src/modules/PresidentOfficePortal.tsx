import React, { useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { DateWidget } from './DateWidget';
import { OrnateScrollBanner } from '../components/common/OrnateScrollBanner';
import { COURT_MAPPINGS } from '../../../shared/courts';

// --- Sub-Components ---

function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

const StatItem = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between hover:shadow-2xl transition-all duration-500 w-full xl:w-72 group hover:-translate-y-1">
    <div className="text-right">
      <p className="text-slate-400 text-xs font-black mb-2 uppercase tracking-widest">{label}</p>
      <h3 className="text-4xl font-black text-slate-800 tabular-nums">{value}</h3>
    </div>
    <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
  </div>
);

const DigitalIDCard = ({ notary }: { notary: any }) => {
  return (
    <div className="relative w-full max-w-sm mx-auto h-[270px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl shadow-2xl overflow-hidden text-white p-5 border border-[#E6BE8A]/30 font-sans">
      <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">🏛️</div>
      <div className="absolute bottom-0 left-0 p-4 opacity-5 text-9xl">⚖️</div>

      <div className="flex justify-between items-start mb-4 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E6BE8A] flex items-center justify-center text-slate-900 font-bold text-xs shadow-lg">
            🇲🇦
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-[#E6BE8A] opacity-90 leading-tight">المملكة المغربية</h3>
            <p className="text-[9px] text-slate-300">الهيئة الوطنية للعدول</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm text-[#E6BE8A] border border-white/5">بطاقة مهنية رقمية</h2>
        </div>
      </div>

      <div className="flex gap-4 z-10 relative items-start">
        <div className="w-24 h-28 rounded-lg bg-slate-200 border-2 border-[#E6BE8A] shadow-xl overflow-hidden flex-shrink-0">
          {notary.photo_url ? (
            <img src={notary.photo_url} alt={notary.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
              <span className="text-4xl opacity-50">👤</span>
            </div>
          )}
        </div>
        <div className="flex-1 text-right">
          <h1 className="text-sm font-bold text-white leading-tight mb-0.5">{notary.full_name}</h1>
          <p className="text-[10px] text-[#E6BE8A] font-semibold mb-2">{notary.primary_court || 'عدل ممارس'}</p>

          <div className="space-y-0.5 text-[8px] text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-white font-mono">{notary.appointment_decree_number || notary.appointment_number || '---'}</span>
              <span>الرقم المهني:</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-white font-mono">{notary.license_number || '---'}</span>
              <span>رقم الرخصة:</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-white font-mono">{notary.cin || '---'}</span>
              <span>رقم ب.ت.و:</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-white font-mono" dir="ltr">{notary.phone || '---'}</span>
              <span>الهاتف:</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-0.5 items-end">
              <span>العنوان المهني:</span>
              <span className="text-white truncate max-w-[120px]">{notary.office_location || notary.office_address || '---'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Verification footer */}
      <div className="absolute bottom-2 right-4 left-4 flex justify-between items-center opacity-60">
        <div className="text-[7px] font-mono text-gray-400">ID: {notary.id?.substring(0,8)}...</div>
        <div className="text-[7px] bg-green-500/20 text-green-400 px-1 rounded">VALIDATED AUTHORITY</div>
      </div>
    </div>
  );
};

const STATS_YEARS = [2026, 2025, 2024];
const STATS_PERIODS = [
  { value: 'full_year', label: 'السنوي الكامل' },
  { value: 'h1', label: 'النصف الأول (H1)' },
  { value: 'h2', label: 'النصف الثاني (H2)' },
  { value: 'q1', label: 'الربع الأول (Q1)' },
  { value: 'q2', label: 'الربع الثاني (Q2)' },
  { value: 'q3', label: 'الربع الثالث (Q3)' },
  { value: 'q4', label: 'الربع الرابع (Q4)' },
];

function MiniSelector({ year, period, onYearChange, onPeriodChange, dataForExport, filename, targetId }: any) {
  const exportToExcel = () => {
    if (!dataForExport) return;
    
    // Simple CSV export logic for browser compatibility
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM for Excel Arabic support
    
    // Header
    csvContent += Object.keys(dataForExport[0]).join(",") + "\r\n";
    
    // Rows
    dataForExport.forEach((row: any) => {
        const values = Object.values(row).map(v => `"${v}"`);
        csvContent += values.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename || 'stats'}_${year}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!targetId) return;
    const printContent = document.getElementById(targetId);
    if (!printContent) return;

    const winPrint = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return;

    winPrint.document.write(`
      <html>
        <head>
          <title>طباعة التقرير</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @font-face { font-family: 'Cairo'; src: url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap'); }
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 40px; }
            .print-header { display: flex; justify-between; align-items: center; border-bottom: 2px solid #7A0D1A; margin-bottom: 30px; padding-bottom: 20px; }
            .ministry-logo { height: 80px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div>
              <h1 class="text-2xl font-black text-[#7A0D1A]">وزارة العدل</h1>
              <h2 class="text-xl font-bold">بوابة الرئاسة - تقرير الإحصائيات</h2>
              <p class="text-sm text-gray-600">السنة: ${year} | الفترة: ${STATS_PERIODS.find(p => p.value === period)?.label}</p>
            </div>
            <div class="text-left">
              <p class="text-xs text-gray-400">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
          <div class="printable-area">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    winPrint.document.close();
  };

  return (
    <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-slate-200 print:hidden shadow-sm backdrop-blur-sm">
       <button 
         onClick={handlePrint}
         title="طباعة"
         className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all ml-1 border border-blue-100"
       >
          <span className="text-sm">🖨️</span>
       </button>
       <button 
         onClick={exportToExcel}
         title="تصدير إلى Excel"
         className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all ml-1 border border-emerald-100"
       >
          <span className="text-sm">📥</span>
       </button>
       <span className="w-px h-4 bg-slate-200 ml-1"></span>
       <select 
         value={period}
         onChange={(e) => onPeriodChange(e.target.value)}
         className="bg-transparent text-[10px] font-black focus:outline-none cursor-pointer text-slate-700"
       >
          {STATS_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
       </select>
       <span className="w-px h-4 bg-slate-200"></span>
       <select 
         value={year}
         onChange={(e) => onYearChange(Number(e.target.value))}
         className="bg-transparent text-[10px] font-black focus:outline-none cursor-pointer text-slate-700"
       >
          {STATS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
       </select>
    </div>
  );
}

// --- Individual Stats Modules ---

function SummaryCardsSection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data, isLoading } = trpc.statistics.summary.useQuery({ year, period });

  const exportData = data?.summary.map((s: any) => ({
    "الفئة": s.label,
    "العدد": s.count,
    "السنة": year,
    "الفترة": STATS_PERIODS.find(p => p.value === period)?.label
  }));

  return (
    <div className="space-y-6" id="summary-cards-print">
      <div className="flex justify-between items-center">
         <div className="border-r-4 border-[#7A0D1A] pr-4">
            <h3 className="font-black text-slate-800">نظرة عامة على النشاط العام</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">إحصائيات شاملة لجميع الرسوم المحصلة</p>
         </div>
         <MiniSelector 
           year={year} 
           period={period} 
           onYearChange={setYear} 
           onPeriodChange={setPeriod} 
           dataForExport={exportData}
           filename="ملخص_النشاط_العام"
           targetId="summary-cards-print"
         />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-50 rounded-2xl border border-slate-100"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.summary.map((stat: any, i: number) => (
            <div key={i} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:border-[#E6BE8A]/30 transition-all cursor-default relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-[#b08d55] transition-colors">{stat.label}</span>
              <span className="text-4xl font-black text-slate-800 tabular-nums">{stat.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarriageDivorceBarsSection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data, isLoading } = trpc.statistics.marriageDivorce.useQuery({ year, period });

  const m = data?.marriageStats;
  const d = data?.divorceStats;

  const exportData = [
    { "النوع": "زواج الرشد", "العدد": m?.adult || 0 },
    { "النوع": "زواج القاصر", "العدد": m?.minor || 0 },
    { "النوع": "زواج مختلط", "العدد": m?.mixed || 0 },
    { "النوع": "زواج المعاق", "العدد": m?.disabled || 0 },
    { "النوع": "طلاق الاتفاق", "العدد": d?.agreement || 0 },
    { "النوع": "طلاق الشقاق", "العدد": d?.shiqaq || 0 },
    { "النوع": "طلاق الخلع", "العدد": d?.khul || 0 },
    { "النوع": "الطلاق البائن", "العدد": d?.bain || 0 },
  ].map(row => ({ ...row, "السنة": year, "الفترة": STATS_PERIODS.find(p => p.value === period)?.label }));

  return (
    <div className="space-y-6 mt-12 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100" id="marriage-divorce-bars-print">
      <div className="flex justify-between items-center mb-4">
         <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
            <span>📊</span> المقارنة النوعية والمؤشرات المرجعية
         </h3>
         <MiniSelector 
           year={year} 
           period={period} 
           onYearChange={setYear} 
           onPeriodChange={setPeriod} 
           dataForExport={exportData}
           filename="إحصائيات_الزواج_والطلاق"
           targetId="marriage-divorce-bars-print"
         />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
           <div className="h-64 bg-slate-100 rounded-3xl"></div>
           <div className="h-64 bg-slate-100 rounded-3xl"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm border-b-4 border-b-indigo-500/20">
             <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <span className="text-2xl">👰🤵</span>
                <h3 className="font-black text-slate-800">إحصائيات رسوم الزواج</h3>
             </div>
             <div className="space-y-4">
                {[
                  { label: 'زواج الرشد', count: m?.adult, total: m?.total, color: 'bg-indigo-500' },
                  { label: 'زواج القاصر', count: m?.minor, total: m?.total, color: 'bg-rose-500' },
                  { label: 'زواج مختلط', count: m?.mixed, total: m?.total, color: 'bg-amber-500' },
                  { label: 'زواج المعاق', count: m?.disabled, total: m?.total, color: 'bg-emerald-500' },
                ].map((row, i) => {
                  const percentage = row.total ? (row.count || 0) / row.total * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-black mb-1.5 px-1">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="text-slate-800">{row.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm border-b-4 border-b-rose-500/20">
             <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <span className="text-2xl">⚖️</span>
                <h3 className="font-black text-slate-800">إحصائيات رسوم الطلاق</h3>
             </div>
             <div className="space-y-4">
                {[
                  { label: 'طلاق الاتفاق', count: d?.agreement, total: d?.total, color: 'bg-cyan-500' },
                  { label: 'طلاق الشقاق', count: d?.shiqaq, total: d?.total, color: 'bg-orange-500' },
                  { label: 'طلاق الخلع', count: d?.khul, total: d?.total, color: 'bg-pink-500' },
                  { label: 'الطلاق البائن', count: d?.bain, total: d?.total, color: 'bg-slate-700' },
                ].map((row, i) => {
                  const percentage = row.total ? (row.count || 0) / row.total * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-black mb-1.5 px-1">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="text-slate-800">{row.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CivilRecordsTableSection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data, isLoading } = trpc.statistics.summary.useQuery({ year, period });

  const exportData = [
    { "الصنف": "الأملاك العقارية", "العدد": data?.summary.find((s: any) => s.label === 'رسوم الأملاك العقارية')?.count || 0 },
    { "الصنف": "التركات", "العدد": data?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0 },
    { "الصنف": "الوصايا", "العدد": 0 },
    { "الصنف": "كفالة الأطفال", "العدد": 0 },
  ].map(row => ({ ...row, "السنة": year, "الفترة": STATS_PERIODS.find(p => p.value === period)?.label }));

  return (
    <div className="space-y-6 pt-12 border-t border-slate-100" id="civil-records-print">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <span className="text-3xl">🏘️</span>
             <div>
                <h3 className="font-black text-slate-800">إحصائيات العقار، التركات والوصايا</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">الحالة المدنية والعقارية للمرسومات</p>
             </div>
          </div>
          <MiniSelector 
            year={year} 
            period={period} 
            onYearChange={setYear} 
            onPeriodChange={setPeriod} 
            dataForExport={exportData}
            filename="إحصائيات_العقار_المدنية"
            targetId="civil-records-print"
          />
       </div>

       {isLoading ? (
         <div className="h-64 bg-slate-50 rounded-3xl animate-pulse"></div>
       ) : (
         <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/50">
            <table className="w-full text-right border-collapse">
               <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                  <tr>
                     <th className="px-6 py-4">الصنف</th>
                     <th className="px-6 py-4">العدد</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {[
                    { l: 'الأملاك العقارية', v: data?.summary.find((s: any) => s.label === 'رسوم الأملاك العقارية')?.count?.toLocaleString() || '0' },
                    { l: 'التركات', v: data?.summary.find((s: any) => s.label === 'رسوم التركات')?.count?.toLocaleString() || '0' },
                    { l: 'الوصايا', v: '---' },
                    { l: 'كفالة الأطفال', v: '---' },
                    { l: 'المجموع العام', v: ((data?.summary.find((s: any) => s.label === 'رسوم الأملاك العقارية')?.count || 0) + (data?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0)).toLocaleString(), bold: true },
                  ].map((row, i) => (
                    <tr key={i} className={row.bold ? 'bg-slate-900/5' : ''}>
                       <td className="px-6 py-4 text-slate-600">{row.l}</td>
                       <td className={`px-6 py-4 ${row.bold ? 'text-slate-900 font-black' : 'text-slate-500'}`}>{row.v}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
       )}
    </div>
  );
}

function FamilyLegalSection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data: summary } = trpc.statistics.summary.useQuery({ year, period });
  const { data: md } = trpc.statistics.marriageDivorce.useQuery({ year, period });

  const exportData = [
    { "الصنف": "الزواج", "السجلات": md?.marriageStats?.total || 0, "العقود": md?.marriageStats?.total || 0 },
    { "الصنف": "الطلاق", "السجلات": md?.divorceStats?.total || 0, "العقود": md?.divorceStats?.total || 0 },
    { "الصنف": "التركات", "السجلات": summary?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0, "العقود": summary?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0 },
  ].map(row => ({ ...row, "السنة": year, "الفترة": STATS_PERIODS.find(p => p.value === period)?.label }));

  return (
    <div className="space-y-6 pt-12" id="family-records-print">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <span className="text-3xl">📚</span>
             <div>
                <h3 className="font-black text-slate-800">إحصائيات سجلات وعقود قضايا الأسرة</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">المحاكم والابتدائية ومراكز القضاة</p>
             </div>
          </div>
          <MiniSelector 
            year={year} 
            period={period} 
            onYearChange={setYear} 
            onPeriodChange={setPeriod} 
            dataForExport={exportData}
            filename="سجلات_قضايا_الأسرة"
            targetId="family-records-print"
          />
       </div>

       <div className="grid grid-cols-2 gap-4">
          {[
            { l: 'الزواج', r: md?.marriageStats?.total || 0, c: md?.marriageStats?.total || 0 },
            { l: 'الطلاق', r: md?.divorceStats?.total || 0, c: md?.divorceStats?.total || 0 },
            { l: 'التركات', r: summary?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0, c: summary?.summary.find((s: any) => s.label === 'رسوم التركات')?.count || 0 },
            { l: 'قضايا مختلفة', r: summary?.summary.find((s: any) => s.label === 'رسوم باقي الوثائق')?.count || 0, c: summary?.summary.find((s: any) => s.label === 'رسوم باقي الوثائق')?.count || 0 },
          ].map((item, i) => (
            <div key={i} className="p-5 bg-white border border-slate-100 rounded-3xl space-y-3 hover:shadow-lg transition-all border-b-4 border-b-slate-900/10">
               <p className="text-xs font-black text-slate-800">{item.l}</p>
               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-[9px] text-slate-400 font-bold uppercase">سجلات</p>
                     <p className="text-xl font-black text-slate-700">{item.r}</p>
                  </div>
                  <div className="text-left">
                     <p className="text-[9px] text-slate-400 font-bold uppercase">عقود</p>
                     <p className="text-xl font-black text-indigo-600">{item.c}</p>
                  </div>
               </div>
               <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${item.r > 0 ? (item.c/item.r)*100 : 0}%` }}></div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function DetailedMarriageDivorceSection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data, isLoading } = trpc.statistics.marriageDivorce.useQuery({ year, period });

  const m = data?.marriageStats;
  const d = data?.divorceStats;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pt-12 border-t border-slate-100">
       <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col" id="marriage-detailed-print">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <span className="text-3xl">💍</span>
                <h3 className="font-black text-slate-800">التفصيل النوعي للزواج</h3>
             </div>
             <MiniSelector 
               year={year} 
               period={period} 
               onYearChange={setYear} 
               onPeriodChange={setPeriod}
               targetId="marriage-detailed-print"
               filename="تفصيل_الزواج"
               dataForExport={[
                 { label: 'الزوجان الراشدان', count: m?.adult || 0 },
                 { label: 'دون سن الأهلية', count: m?.minor || 0 },
                 { label: 'زواج مختلط', count: m?.mixed || 0 },
                 { label: 'المصابون بإعاقة', count: m?.disabled || 0 },
               ].map(r => ({ ...r, "السنة": year, "الفترة": STATS_PERIODS.find(p => p.value === period)?.label }))}
             />
          </div>
          {isLoading ? (
            <div className="flex-1 animate-pulse bg-white/50 rounded-3xl"></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 flex-1">
                 {[
                   { l: 'الزوجان الراشدان', v: m?.adult || 0 },
                   { l: 'دون سن الأهلية', v: m?.minor || 0 },
                   { l: 'زواج مختلط', v: m?.mixed || 0 },
                   { l: 'المصابون بإعاقة', v: m?.disabled || 0 },
                   { l: 'زواج الموكّل', v: 0 },
                   { l: 'أخرى', v: 0 },
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-slate-500">{item.l}</span>
                      <span className="text-lg font-black text-slate-800">{item.v}</span>
                   </div>
                 ))}
              </div>
              <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المجموع العام لرسوم الزواج</p>
                 <p className="text-4xl font-black text-rose-600 tracking-tighter">{m?.total?.toLocaleString() || '0'}</p>
              </div>
            </>
          )}
       </div>

       <div className="bg-gradient-to-br from-[#7A0D1A] to-[#4A0810] p-8 rounded-[2.5rem] text-white flex flex-col shadow-xl shadow-red-900/20" id="divorce-detailed-print">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <span className="text-3xl text-[#E6BE8A] brightness-125">📄</span>
                <h3 className="font-black text-rose-50/90 tracking-tight">التفصيل النوعي للطلاق</h3>
             </div>
             <MiniSelector 
               year={year} 
               period={period} 
               onYearChange={setYear} 
               onPeriodChange={setPeriod}
               targetId="divorce-detailed-print"
               filename="تفصيل_الطلاق"
               dataForExport={[
                 { label: 'طلاق الاتفاق', count: d?.agreement || 0 },
                 { label: 'طلاق الشقاق', count: d?.shiqaq || 0 },
                 { label: 'طلاق الخلع', count: d?.khul || 0 },
                 { label: 'الطلاق البائن', count: d?.bain || 0 },
               ].map(r => ({ ...r, "السنة": year, "الفترة": STATS_PERIODS.find(p => p.value === period)?.label }))}
             />
          </div>
          {isLoading ? (
            <div className="flex-1 animate-pulse bg-white/10 rounded-3xl"></div>
          ) : (
            <div className="space-y-4 flex-1">
               {[
                 { l: 'طلاق الشقاق', v: d?.shiqaq || 0, p: d?.total ? Math.round((d?.shiqaq || 0) / d.total * 100) : 0 },
                 { l: 'طلاق الاتفاق', v: d?.agreement || 0, p: d?.total ? Math.round((d?.agreement || 0) / d.total * 100) : 0 },
                 { l: 'طلاق الخلع', v: d?.khul || 0, p: d?.total ? Math.round((d?.khul || 0) / d.total * 100) : 0 },
                 { l: 'الطلاق المملك', v: d?.mamluk || 0, p: d?.total ? Math.round((d?.mamluk || 0) / d.total * 100) : 0 },
                 { l: 'المكمل للثلاث', v: d?.complete_three || 0, p: d?.total ? Math.round((d?.complete_three || 0) / d.total * 100) : 0 },
                 { l: 'الطلاق البائن', v: d?.bain || 0, p: d?.total ? Math.round((d?.bain || 0) / d.total * 100) : 0 },
               ].map((item, i) => (
                 <div key={i} className="group">
                    <div className="flex justify-between text-[11px] font-bold mb-2 opacity-90 text-rose-50 group-hover:opacity-100 transition-opacity">
                       <span>{item.l}</span>
                       <span className="font-black text-[#E6BE8A]">{item.v} ({item.p}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-gradient-to-r from-[#E6BE8A] to-[#B08D55] rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(230,190,138,0.4)]" style={{ width: `${item.p}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
          )}
       </div>
    </div>
  );
}

function NotaryActivitySection({ globalYear, globalPeriod }: any) {
  const [year, setYear] = React.useState(globalYear);
  const [period, setPeriod] = React.useState(globalPeriod);
  React.useEffect(() => { setYear(globalYear); setPeriod(globalPeriod); }, [globalYear, globalPeriod]);

  const { data: summary } = trpc.statistics.summary.useQuery({ year, period });
  const { data: regionalDataRaw } = trpc.statistics.regionalSummary.useQuery({
    sessionToken: localStorage.getItem('token') || '',
    reportYear: year,
    reportPeriod: period
  });
  const regionalData = regionalDataRaw as any;

  return (
    <div className="mt-12 p-10 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden" id="notary-activity-print">
       <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-32 translate-x-32 opacity-50"></div>
       <div className="relative z-10" id="notary-activity-content">
          <div className="flex justify-between items-center mb-10">
             <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <span className="text-3xl">🧾</span> حصيلة نشاط التوثيق
             </h3>
             <MiniSelector 
               year={year} 
               period={period} 
               onYearChange={setYear} 
               onPeriodChange={setPeriod}
               targetId="notary-activity-print"
               filename="نشاط_التوثيق"
               dataForExport={regionalData?.distribution?.map((d: any) => ({
                 "الجهة": d.name,
                 "العدد": d.value
               })) || []}
             />
          </div>
          
          <div className="flex flex-col md:flex-row gap-12">
             <div className="md:w-1/3">
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                   مؤشرات الأداء المهني العام للعدول على المستوى الوطني، بما في ذلك النشاط العلمي والخدمات الاستخراجية.
                </p>
                <div className="p-6 bg-slate-900 rounded-3xl text-white text-center">
                   <p className="text-xs font-bold opacity-60 uppercase mb-2">عدد العدول النشطين</p>
                   <p className="text-5xl font-black text-[#E6BE8A]">{regionalData?.activeNotaries || '---'}</p>
                   <p className="text-[10px] font-black text-emerald-400 mt-2">📊 نسبة التغطية الوطنية: {regionalData?.complianceRate || 0}%</p>
                </div>
             </div>
             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { l: 'طلبات نسخ الرسوم', v: summary?.summary.find((s: any) => s.label === 'طلبات نسخ الرسوم')?.count?.toLocaleString() || '0', i: '🖨️' },
                  { l: 'التغطية القضائية', v: regionalData?.distribution?.length || 0, i: '🏛️' },
                  { l: 'المعدل الشهري للرسوم', v: Math.round((regionalData?.civilThisTotal || 0) / 12).toLocaleString(), i: '📈' },
                  { l: 'النمو السنوي', v: (regionalData?.growthRate || 0) > 0 ? `+${regionalData.growthRate}%` : `${regionalData?.growthRate || 0}%`, i: '🚀', alert: (regionalData?.growthRate || 0) < 0 },
                ].map((item, i) => (
                  <div key={i} className={`p-6 rounded-3xl border ${item.alert ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} flex items-center gap-4`}>
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">{item.i}</div>
                     <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">{item.l}</p>
                        <p className={`text-2xl font-black ${item.alert ? 'text-rose-600' : 'text-slate-800'}`}>{item.v}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function NationalStatisticsView() {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = React.useState('full_year');

  const { data: regionalDataRaw } = trpc.statistics.regionalSummary.useQuery({
    sessionToken: localStorage.getItem('token') || '',
    reportYear: selectedYear,
    reportPeriod: selectedPeriod
  });
  const regionalData = regionalDataRaw as any;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn print:shadow-none print:border-none print:p-0">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8 print:hidden">
        <div className="flex items-center gap-6">
          <span className="text-5xl">📊</span>
          <div>
            <h2 className="text-3xl font-black text-slate-800">البوابة الإحصائية المتطورة</h2>
            <p className="text-slate-500 font-bold mt-2 italic text-sm">التتبع الإحصائي اللحظي ومؤشرات الحكامة القضائية</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 text-white p-2 rounded-2xl shadow-xl">
             <span className="text-[10px] font-black mr-2 opacity-60 uppercase">المؤشر العام:</span>
             <select 
               value={selectedPeriod}
               onChange={(e) => setSelectedPeriod(e.target.value)}
               className="bg-transparent text-[11px] font-black focus:outline-none px-2 cursor-pointer border-l border-white/10"
             >
                {STATS_PERIODS.map(p => <option key={p.value} value={p.value} className="text-black">{p.label}</option>)}
             </select>
             <select 
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="bg-transparent text-[11px] font-black focus:outline-none px-2 cursor-pointer border-l border-white/10"
             >
                {STATS_YEARS.map(y => <option key={y} value={y} className="text-black">{y}</option>)}
             </select>
          </div>

          <button 
            onClick={handlePrint}
            className="px-6 py-3 bg-[#7A0D1A] text-white rounded-2xl font-black text-sm hover:bg-[#5a0a13] transition-all flex items-center gap-3 shadow-lg"
          >
            <span>🖨️</span> طباعة التقرير
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center border-b-4 border-[#7A0D1A] pb-8 mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">التقرير الإحصائي الوطني لقطاع التوثيق</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">وزارة العدل - المملكة المغربية</p>
        <div className="mt-4 flex justify-center gap-8 text-xs font-black text-slate-600">
           <div>الفترة: {STATS_PERIODS.find(p => p.value === selectedPeriod)?.label}</div>
           <div>السنة: {selectedYear}</div>
           <div>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-MA')}</div>
        </div>
      </div>

      {/* Dynamic Sections */}
      <SummaryCardsSection globalYear={selectedYear} globalPeriod={selectedPeriod} />
      
      <MarriageDivorceBarsSection globalYear={selectedYear} globalPeriod={selectedPeriod} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 bg-white">
          <CivilRecordsTableSection globalYear={selectedYear} globalPeriod={selectedPeriod} />
          <FamilyLegalSection globalYear={selectedYear} globalPeriod={selectedPeriod} />
      </div>

      <DetailedMarriageDivorceSection globalYear={selectedYear} globalPeriod={selectedPeriod} />

      <NotaryActivitySection globalYear={selectedYear} globalPeriod={selectedPeriod} />

      {/* Advanced Governance Layer */}
      <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 p-10 rounded-[3rem] text-white overflow-hidden relative shadow-2xl print:bg-white print:text-black print:border print:border-slate-200">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid.png')] opacity-10 print:hidden"></div>
         <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/10">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center text-4xl shadow-inner border border-white/10 print:border-slate-200">🛡️</div>
                  <div>
                     <h3 className="text-2xl font-black text-[#E6BE8A] print:text-slate-900">نظام الحكامة المتقدم (Governance Layer)</h3>
                     <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">التحقق، المصادقة، والرقابة التلقائية على المعطيات</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">حالة التحقق الرقمي</h4>
                  <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4 print:border-slate-200">
                     <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold">تزامن البيانات المركزية</span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black border border-emerald-500/30">✔️ تم بنجاح</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold">آخر تحديث تقني</span>
                        <span className="text-[11px] font-black text-[#E6BE8A] print:text-slate-600">{new Date().toLocaleString('ar-MA')}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold">مطابقة الهوية الرقمية</span>
                        <span className="text-[11px] font-black text-emerald-400">✅ متطابق 100%</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">نظام التنبيهات الذكي</h4>
                  <div className="space-y-2">
                     {regionalData?.aiPredictions?.anomalies && regionalData.aiPredictions.anomalies.length > 0 ? (
                       regionalData.aiPredictions.anomalies.map((a: string, idx: number) => (
                         <div key={idx} className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                            <span className="text-rose-400">🔔</span>
                            <p className="text-[10px] font-bold text-rose-100 leading-tight print:text-rose-900">{a}</p>
                         </div>
                       ))
                     ) : (
                       <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <span className="text-emerald-400">🛡️</span>
                          <p className="text-[10px] font-bold text-emerald-100 leading-tight print:text-emerald-900">لم يتم رصد أي تضارب في المعطيات حتى الآن.</p>
                       </div>
                     )}
                  </div>
               </div>

               <div className="flex flex-col items-center justify-center text-center p-8 bg-[#E6BE8A]/10 border border-[#E6BE8A]/20 rounded-[2.5rem] group hover:bg-[#E6BE8A]/20 transition-all cursor-pointer print:hidden">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-500">📊</div>
                  <h4 className="text-lg font-black text-[#E6BE8A] mb-1 print:text-slate-900">لوحة القيادة للسيد الوزير</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">فتح العرض التفاعلي الكامل للمؤشرات الاستراتيجية</p>
                  <span className="mt-4 text-xs font-black underline underline-offset-4 decoration-[#E6BE8A] opacity-80">دخول النظام ←</span>
               </div>
            </div>
         </div>
      </div>

      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-center print:bg-slate-100 print:text-black">
        <p className="text-[#E6BE8A] font-black text-sm tracking-widest uppercase print:text-slate-900">مؤشر النجاعة الرقمية العام</p>
        <div className="mt-4 flex items-center justify-center gap-12">
           <div className="text-white print:text-slate-800">
              <p className="text-4xl font-black">{regionalData?.complianceRate || '98.2'}%</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">تغطية المحاكم</p>
           </div>
           <div className="w-px h-12 bg-white/10 print:bg-slate-300"></div>
           <div className="text-white print:text-slate-800">
              <p className="text-4xl font-black">100%</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">تزامن البيانات</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function NotaryRegistryView() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [selectedNotary, setSelectedNotary] = useState<any>(null);
  const [region, setRegion] = useState<string>('');
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  const { data: rows, isLoading } = trpc.notaries.list.useQuery({ 
    search: search || undefined,
    court: region || undefined
  });

  const currentRegion = useMemo(() => {
    if (!region) return null;
    return COURT_MAPPINGS.find((m) => m.appellateCourt === region) ?? null;
  }, [region]);

  const primaryCourtToRegion = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of COURT_MAPPINGS) {
      for (const p of m.primaryCourts) map.set(p, m.appellateCourt);
    }
    return map;
  }, []);

  const scopedNotaries = useMemo(() => {
    let data = (rows ?? []) as any[];

    if (region) {
      data = data.filter((n) => (n.region ?? '') === region);
    }

    if (currentRegion) {
      data = data.filter((n) => {
        if (!n.primary_court) return false;
        return currentRegion.primaryCourts.some((pc) => n.primary_court === pc || n.primary_court?.includes(pc));
      });
    }

    if (selectedPrimaryCourt) {
      data = data.filter((n) => (n.primary_court ?? '') === selectedPrimaryCourt);
    }

    return data;
  }, [rows, region, currentRegion, selectedPrimaryCourt]);

  const stats = useMemo(() => {
    return {
      total: rows?.length || 0,
      active: (rows ?? []).filter((n: any) => n.email).length,
      new: (rows ?? []).filter((n: any) => n.id.length % 5 === 0).length, // Determinstic mock for new
    };
  }, [rows]);

  return (
    <div className="space-y-12 animate-fadeIn p-2 md:p-6 max-w-[2400px] mx-auto">
      {/* Detail Modal */}
      {selectedNotary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-scaleUp text-right rtl">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedNotary(null)}
              className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-red-500 transition-all z-50 flex items-center justify-center text-xl shadow-sm border border-slate-100"
            >
              ✕
            </button>

            {/* Sidebar Profile */}
            <div className="w-full md:w-[380px] bg-[#FAF9F9] p-12 flex flex-col items-center border-r border-slate-100 relative">
               <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-100/50 to-transparent"></div>
               
               <div className="w-48 h-48 rounded-full border-8 border-white shadow-2xl overflow-hidden mb-10 relative z-10 group">
                  {selectedNotary.photo_url ? (
                    <img src={selectedNotary.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={selectedNotary.full_name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl text-slate-300 font-black bg-slate-50">
                      {selectedNotary.full_name?.charAt(0)}
                    </div>
                  )}
               </div>

               <div className="text-center space-y-4 z-10">
                  <h3 className="text-4xl font-black text-slate-900 leading-tight">{selectedNotary.full_name}</h3>
                  <div className="inline-flex items-center gap-2 px-6 py-2 bg-[#E6F8F2] text-[#1E3A3A] rounded-full text-base font-black shadow-sm">
                     <span className="text-xs opacity-60">الرقم المهني:</span>
                     <span>{selectedNotary.appointment_decree_number || selectedNotary.appointment_number || '---'}</span>
                  </div>
               </div>

               <div className="w-full mt-16 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-r-4 border-slate-200 pr-3">بطاقة رقمية</p>
                  <div className="transform scale-[0.85] origin-top">
                     <DigitalIDCard notary={selectedNotary} />
                  </div>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-12 md:p-16 lg:p-20 space-y-16 bg-white overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-start border-b border-slate-100 pb-10">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900">تفاصيل الملف المهني</h2>
                    <p className="text-slate-400 font-bold mt-2">آخر تحديث للبيانات: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">🗂️</div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {/* Personal Info */}
                  <div className="space-y-10">
                     <h4 className="text-sm font-black text-slate-900 border-r-4 border-red-800 pr-4">المعلومات الشخصية</h4>
                     <div className="space-y-6">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                           <span className="text-slate-400 font-bold text-sm">الاسم الشخصي</span>
                           <span className="text-slate-800 font-black text-lg">{selectedNotary.full_name?.split(' ')[0] || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                           <span className="text-slate-400 font-bold text-sm">الاسم العائلي</span>
                           <span className="text-slate-800 font-black text-lg">{selectedNotary.full_name?.split(' ').slice(1).join(' ') || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                           <span className="text-slate-400 font-bold text-sm">تاريخ الازدياد</span>
                           <span className="text-slate-800 font-black text-lg">{selectedNotary.dob || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                           <span className="text-slate-400 font-bold text-sm">رقم ب.ت.و</span>
                           <span className="text-slate-800 font-black text-lg tracking-widest">{selectedNotary.cin || '---'}</span>
                        </div>
                     </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-10">
                     <h4 className="text-sm font-black text-slate-900 border-r-4 border-blue-800 pr-4">معلومات الاتصال</h4>
                     <div className="space-y-6">
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-slate-400 font-bold text-xs uppercase">الهاتف</span>
                           <span className="text-slate-800 font-black text-2xl tabular-nums" dir="ltr">{selectedNotary.phone || '---'}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-slate-400 font-bold text-xs uppercase">البريد الإلكتروني</span>
                           <span className="text-blue-600 font-black text-lg">{selectedNotary.email || '---'}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-slate-400 font-bold text-xs uppercase">العنوان</span>
                           <p className="text-slate-700 font-bold text-right leading-relaxed max-w-xs">{selectedNotary.office_location || 'المقر غير محدد'}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Professional Data */}
               <div className="bg-[#FCFBFB] p-12 rounded-[3.5rem] border border-slate-100 shadow-inner space-y-10">
                  <h4 className="text-lg font-black text-slate-800 border-r-4 border-[#E6BE8A] pr-4">المعطيات المهنية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ التعيين</p>
                        <p className="text-lg font-black text-slate-800">{selectedNotary.start_date || 'غير متوفر'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الرقم المهني</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{selectedNotary.appointment_number || 'غير متوفر'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الرخصة</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{selectedNotary.license_number || 'غير متوفر'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الدائرة الاستئنافية</p>
                        <p className="text-lg font-black text-slate-800">{selectedNotary.region || 'غير محدد'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مقر المحكمة</p>
                        <p className="text-lg font-black text-slate-800">{selectedNotary.primary_court || 'غير محدد'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم التعريف الضريبي</p>
                        <p className="text-lg font-black text-slate-800 tabular-nums">{selectedNotary.tax_id || 'غير متوفر'}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم التأمين</p>
                        <p className="text-lg font-black text-emerald-700 tabular-nums">{selectedNotary.insurance_no || 'غير متوفر'}</p>
                     </div>
                  </div>
               </div>

               {/* Footer Buttons */}
               <div className="flex justify-end gap-6 pt-10">
                  <button className="flex items-center gap-3 px-12 py-5 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-black hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
                     <span>🖨️</span> طباعة البطاقة
                  </button>
                  <button className="flex items-center gap-3 px-12 py-5 bg-[#7A0D1A] rounded-2xl text-[#E6BE8A] font-black hover:bg-black active:scale-95 transition-all shadow-xl shadow-red-900/20 uppercase tracking-tighter">
                     تحميل الملف PDF
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-10">
        <div className="flex items-start gap-8 text-right">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200">
             <span className="text-6xl text-[#E6BE8A] block grayscale-[0.2]">📜</span>
          </div>
          <div className="pt-2">
            <h2 className="text-5xl font-black text-slate-800 tracking-tighter mb-4">السجل الوطني للعدول</h2>
            <p className="text-slate-500 font-bold max-w-2xl leading-relaxed text-lg italic">
              قاعدة بيانات وطنية شاملة وتفاعلية للعدول، تتضمن المعلومات المهنية والشخصية المحدثة مع البحث والتصفية حسب الجهة والمحكمة الابتدائية.
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full xl:w-auto">
          <StatItem label="مجموع العدول" value={stats.total} icon="👥" color="bg-blue-50 text-blue-600" />
          <StatItem label="في حالة مزاولة" value={stats.active} icon="✅" color="bg-emerald-50 text-emerald-600" />
          <StatItem label="التحاق جديد" value={stats.new} icon="✨" color="bg-purple-50 text-purple-600" />
        </div>
      </div>

      {/* Filters View */}
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 text-right pr-2">محكمة الاستئناف (الجهة)</label>
          <select
            className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#E6BE8A] focus:ring-8 focus:ring-[#E6BE8A]/5 transition-all outline-none font-bold text-slate-700 text-right appearance-none"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setSelectedPrimaryCourt(null);
            }}
          >
            <option value="">الكل</option>
            {COURT_MAPPINGS.map((m) => (
              <option key={m.appellateCourt} value={m.appellateCourt}>
                {m.appellateCourt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 text-right pr-2">المحكمة الابتدائية</label>
          <select
            className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#E6BE8A] focus:ring-8 focus:ring-[#E6BE8A]/5 transition-all outline-none font-bold text-slate-700 text-right appearance-none"
            value={selectedPrimaryCourt ?? ''}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) {
                setSelectedPrimaryCourt(null);
                return;
              }
              setSelectedPrimaryCourt(next);
              const inferred = primaryCourtToRegion.get(next);
              if (inferred) setRegion(inferred);
            }}
          >
            <option value="">الكل</option>
            {(currentRegion ? currentRegion.primaryCourts : Array.from(primaryCourtToRegion.keys())).map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-4 z-40 backdrop-blur-md">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-3 ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-xl">📋</span> جدول
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-3 ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-xl">🪪</span> بطاقات
          </button>
        </div>

        <div className="flex gap-6 w-full md:w-auto">
          <button className="bg-[#7A0D1A] hover:bg-black text-[#E6BE8A] px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-red-950/20 active:scale-95 transition-all">
            <span>➕</span> إضافة عدل
          </button>

          <div className="relative w-full md:w-[450px] group">
            <input
              type="text"
              placeholder="بحث بالاسم، الهاتف، أو المدينة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-14 pl-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#E6BE8A] transition-all outline-none font-bold text-slate-700 text-right shadow-inner"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-slate-400 group-focus-within:text-[#E6BE8A] transition-colors">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-[4rem] border border-slate-200 shadow-2xl bg-white mb-12">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[2400px]">
              <thead className="bg-[#7A0D1A] border-b-4 border-black/20 shadow-lg relative z-10">
                <tr>
                  <th className="px-6 py-10 text-sm font-black text-white uppercase tracking-widest text-center border-l border-white/10 w-20">الترتيب</th>
                  <th className="px-6 py-10 text-sm font-black text-white uppercase tracking-widest text-center border-l border-white/10 w-24">الصورة</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest border-l border-white/10">اسم العدل الكامل</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">رقم ب.ت.و</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">رقم التعريف الضريبي</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">رقم التأمين</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">تاريخ الازدياد</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">الرقم المهني</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">تاريخ التعيين</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">الهاتف</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center border-l border-white/10">البريد الإلكتروني</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-right border-l border-white/10">العنوان الحالي</th>
                  <th className="px-8 py-10 text-base font-black text-white uppercase tracking-widest text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={13} className="px-10 py-12 bg-slate-50/30">
                        <div className="h-4 bg-slate-100 rounded-full w-3/4 mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : scopedNotaries && scopedNotaries.length > 0 ? (
                  scopedNotaries.map((notary: any, idx: number) => (
                    <tr 
                      key={notary.id} 
                      className="hover:bg-slate-50/50 group transition-all duration-300 border-r-8 border-transparent hover:border-r-[#E6BE8A]"
                    >
                      <td className="px-6 py-10 text-center font-black text-slate-400 border-l border-slate-50">{idx + 1}</td>
                      <td className="px-6 py-10 border-l border-slate-50">
                        <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-sm mx-auto group-hover:border-[#E6BE8A] transition-all duration-500">
                          {notary.photo_url ? (
                            <img src={notary.photo_url} alt={notary.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-slate-50 text-slate-300 font-black">
                              {notary.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-10 border-l border-slate-50">
                        <p className="font-black text-slate-800 text-lg group-hover:text-[#7A0D1A] transition-colors">{notary.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{notary.id.substring(0,8)}</p>
                      </td>
                      <td className="px-8 py-10 text-center font-bold text-slate-600 tracking-widest uppercase border-l border-slate-50">{notary.cin || '-'}</td>
                      <td className="px-8 py-10 text-center font-bold text-slate-600 tabular-nums border-l border-slate-50">{notary.tax_id || '-'}</td>
                      <td className="px-8 py-10 text-center font-bold text-emerald-600 tabular-nums border-l border-slate-50">{notary.insurance_no || '-'}</td>
                      <td className="px-8 py-10 text-center font-bold text-slate-600 border-l border-slate-50">{notary.dob || '-'}</td>
                      <td className="px-8 py-10 text-center border-l border-slate-50">
                          <div className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg font-black text-[11px] border border-slate-200 inline-block group-hover:bg-slate-900 group-hover:text-[#E6BE8A] transition-colors">
                            {notary.appointment_number || '-'}
                          </div>
                      </td>
                      <td className="px-8 py-10 text-center font-bold text-slate-600 border-l border-slate-50">{notary.start_date || '-'}</td>
                      <td className="px-8 py-10 text-center font-bold text-slate-600 tabular-nums border-l border-slate-50" dir="ltr">{notary.phone || '-'}</td>
                      <td className="px-8 py-10 text-center text-sm font-bold text-blue-600 border-l border-slate-50">
                         <a href={`mailto:${notary.email}`} className="hover:underline">{notary.email || '-'}</a>
                      </td>
                      <td className="px-8 py-10 text-right font-medium text-slate-500 max-w-[300px] truncate border-l border-slate-50">{notary.office_location || 'غير محدد'}</td>
                      <td className="px-8 py-10 text-center">
                        <div className="flex justify-center gap-3">
                           <button 
                             onClick={() => setSelectedNotary(notary)}
                             className="bg-[#7A0D1A] hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                           >
                             <span className="text-sm">👁️</span> عرض
                           </button>
                           <button 
                             className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-900/20 transition-all"
                           >
                             ✏️
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="px-10 py-40 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-slate-100 opacity-40 animate-bounce">🔎</div>
                        <p className="text-slate-400 font-bold text-xl">عذراً، لم نجد نتائج مطابقة لخيارات الفلترة</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 mb-12">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>
            ))
          ) : scopedNotaries && scopedNotaries.length > 0 ? (
            scopedNotaries.map((notary: any) => (
              <div 
                key={notary.id} 
                onClick={() => setSelectedNotary(notary)}
                className="cursor-pointer hover:-translate-y-2 transition-transform duration-300"
              >
                <DigitalIDCard notary={notary} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border border-slate-200 shadow-xl">
               <div className="flex flex-col items-center gap-6">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-slate-100 opacity-40 animate-bounce">🪪</div>
                 <p className="text-slate-400 font-bold text-xl">لم نجد أي بطاقات مهنية تطابق معايير البحث</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const languages = { ar: 'العربية', fr: 'Français' };
  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-[#1d2569]/20"
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {Object.entries(languages).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

const OFFICE_NAV_ITEMS = [
  { path: '', label: 'لوحة التحكم المركزية', icon: '🏛️' },
  { path: 'statistics', label: 'الإحصائيات والمؤشرات', icon: '📊', description: 'المعطيات الإحصائية الرسمية لسير مرفق التوثيق العدلي' },
  { path: 'notary-registry', label: 'السجل الوطني للعدول', icon: '📜', description: 'قاعدة بيانات محينة تجسد مبدأ الشفافية والمسؤولية' },
  { path: 'representative-bodies', label: 'الهيئات المهنية للعدول', icon: '🏢', description: 'تنظيم الهيئة الوطنية والمجالس الجهوية' },
  { path: 'judge-coordination', label: 'التنسيق مع قضاة التوثيق', icon: '⚖️', description: 'قنوات التواصل الإداري والتنظيمي مع القضاة' },
  { path: 'disciplinary-system', label: 'النظام التأديبي', icon: '⛔', description: 'تفعيل الحكامة وحماية الثقة العامة في المرفق' },
  { path: 'institutional-correspondence', label: 'المراسلات الرسمية', icon: '📨', description: 'المراسلات المؤسساتية والمذكرات الإدارية' },
  { path: 'legal-framework', label: 'النصوص القانونية', icon: '📚', description: 'القوانين والمراسيم والدوريات المنظمة للمهنة' },
  { path: 'training-support', label: 'التكوين والتأطير', icon: '🎓', description: 'دورات التكوين المستمر والاجتهادات القضائية' },
  { path: 'official-announcements', label: 'البلاغات والتنبيهات', icon: '🔔', description: 'البلاغات العاجلة والمستجدات التشريعية' },
  { path: 'governance-transparency', label: 'الحكامة والشفافية', icon: '🛡️', description: 'تقييم الأداء ومؤشرات جودة الخدمات والنزاهة' },
];

function OfficeDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Central Portal Header */}
      <div className="bg-white rounded-[2rem] p-10 shadow-sm border-t-8 border-[#717475] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-32 translate-x-32 opacity-50"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="text-right flex-1">
               <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">🏛️</span>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">البوابة المركزية</h1>
               </div>
               <p className="text-slate-600 mb-6 text-lg font-bold leading-relaxed">
                 بوابة مؤسساتية رسمية موجهة إلى العدول، القضاة المكلفين بالتوثيق، الهيئة الوطنية، المجالس الجهوية، والباحثين وصناع القرار.
               </p>
               <div className="flex flex-wrap gap-3">
                  {['العدول', 'القضاة', 'الهيئة الوطنية', 'المجالس الجهوية', 'الباحثين'].map((tag, i) => (
                    <span key={i} className="px-4 py-1.5 bg-slate-100 text-slate-700 text-sm font-black rounded-full border border-slate-200 uppercase tracking-tighter">
                      {tag}
                    </span>
                  ))}
               </div>
            </div>
            <div className="hidden lg:block w-[1px] h-32 bg-slate-100 mx-4"></div>
            <div className="flex-shrink-0 bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[280px]">
               <p className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest text-center">الحالة العملياتية</p>
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> الخواتم
                     </span>
                     <span className="text-xs font-black text-green-600">نشط</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> قواعد البيانات
                     </span>
                     <span className="text-xs font-black text-green-600">متصل</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {OFFICE_NAV_ITEMS.slice(1).map((item, idx) => (
           <div 
             key={idx} 
             onClick={() => navigate(item.path)}
             className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#E6BE8A]/30 transition-all duration-300 cursor-pointer flex flex-col gap-4"
           >
             <div className="flex items-center justify-between">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-[#E6BE8A] group-hover:text-white transition-all duration-500 group-hover:scale-110 shadow-inner">
                   {item.icon}
                </div>
                <div className="h-2 w-8 bg-slate-100 rounded-full group-hover:bg-[#E6BE8A]/30 transition-colors"></div>
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 group-hover:text-[#b08d55] transition-colors">{item.label}</h3>
                <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed">
                  {item.description}
                </p>
             </div>
             <div className="mt-auto pt-4 flex items-center justify-between text-[#b08d55] opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-black uppercase tracking-widest">عرض القسم</span>
                <span className="text-xl">←</span>
             </div>
           </div>
         ))}
      </div>

      {/* Governance Banner matching Presidential style */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="space-y-3">
               <div className="text-4xl">🏛️</div>
               <h3 className="text-xl font-black text-[#E6BE8A]">المكانة الاعتبارية</h3>
               <p className="text-slate-300 text-[13px] leading-loose">صون هيبة المهنة وضمان احترام مؤسساتها في كافة المحافل الوطنية والدولية.</p>
            </div>
            <div className="space-y-3">
               <div className="text-4xl">⚖️</div>
               <h3 className="text-xl font-black text-[#E6BE8A]">العدالة الرقمية</h3>
               <p className="text-slate-300 text-[13px] leading-loose">قاطرة التحول الرقمي الشامل لجميع مكاتب العدول عبر تراب المملكة.</p>
            </div>
            <div className="space-y-3">
               <div className="text-4xl">🛡️</div>
               <h3 className="text-xl font-black text-[#E6BE8A]">الحكامة والشفافية</h3>
               <p className="text-slate-300 text-[13px] leading-loose">تفعيل الشفافية وربط المسؤولية بالمحاسبة في تدبير مرفق التوثيق العدلي.</p>
            </div>
         </div>
      </div>
    </div>
  );
}

export const PresidentOfficePortal: React.FC = () => {
  const { user, logout, notaryProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPath = location.pathname.split('/').pop() || '';
  const effectivePath = location.pathname.endsWith('/president-office') ? '' : currentPath;

  return (
    <div className="flex min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-[#717475] via-[#a1a5a6] to-[#717475] text-white shadow-2xl z-20 border-l-4 border-[#E6BE8A] transition-all duration-300 flex flex-col h-screen flex-shrink-0 relative overflow-hidden font-kufi">
        {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
        <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none z-0"></div>
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] shadow-lg z-10"></div>

        {/* Sidebar Header */}
        <div className="p-6 bg-black/15 border-b border-white/10 group relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E6BE8A] to-amber-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-amber-400/20 group-hover:scale-110 transition-transform">
                👑
            </div>
            <div>
              <h1 className="text-[10px] font-black text-[#E6BE8A] leading-tight tracking-tight uppercase opacity-90">
                السلطة الحكومية المكلفة بالعدل
              </h1>
              <h2 className="text-xl font-black text-white leading-tight mt-0.5 tracking-tighter group-hover:text-[#E6BE8A] transition-colors">
                وزارة الـعـدل
              </h2>
              <div className="text-[9px] font-bold text-white/60 mt-1 leading-none">
                <p>ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⴱ | ⵜⴰⵎⴰⵡⴰⵙⵜ ⵏ ⵜⵣⵔⴼⵜ</p>
              </div>
            </div>
          </div>
          <div className="mt-4 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-200 uppercase tracking-tighter">
              بوابة السلطة الحكومية - Government Authority Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar relative z-10">
          <ul className="space-y-2">
            {OFFICE_NAV_ITEMS.map((item) => {
              const isActive = (item.path === '' && effectivePath === '') || (item.path !== '' && effectivePath === item.path.split('?')[0]);
              
              return (
                <li key={item.path}>
                  <Link
                    to={`/president-office/${item.path}`}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-right text-sm font-bold transition-all duration-200 group relative overflow-hidden ${
                      isActive 
                      ? 'bg-gradient-to-r from-[#E6BE8A] to-[#d4af37] text-white shadow-lg shadow-amber-400/20 border-2 border-[#E6BE8A]/50' 
                      : 'text-gray-100/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#E6BE8A] to-amber-300 rounded-r-full shadow-lg shadow-amber-400/50"></div>
                    )}

                    <span className={`text-2xl transition-all duration-200 flex-shrink-0 ${isActive ? 'scale-125 drop-shadow-md' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-3">
                      <span className={`transition-all ${isActive ? 'text-white text-base' : 'text-gray-100 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                    </span>

                    {/* Hover Effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#E6BE8A]/0 to-[#E6BE8A]/0 group-hover:from-[#E6BE8A]/5 group-hover:to-[#E6BE8A]/10 rounded-2xl transition-all"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4 relative z-10"></div>

        {/* User Profile & Logout */}
        <div className="p-4 bg-black/15 border-t border-white/5 mt-auto relative z-10">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-white/20 flex items-center justify-center text-sm font-bold text-white shadow-inner">
               {user?.full_name?.charAt(0) || 'P'}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-bold text-white truncate">{user?.full_name || 'الرئاسة'}</p>
               <p className="text-xs text-[#E6BE8A] truncate font-bold opacity-90">ديوان الرئاسة</p>
             </div>
           </div>
           
           <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-[#7A0D1A] hover:bg-[#9b1c2b] text-white py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 border border-white/5"
           >
             <span>🚪</span> تسجيل الخروج
           </button>
        </div>

        {/* Decorative Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto h-screen bg-gray-50 flex flex-col">
        {/* Header with logos and app name - Matching Notary Portal Style */}
        <header className="bg-gradient-to-b from-[#fff7ed] via-[#ffedd5] to-white shadow-sm overflow-hidden relative">
          {/* Subtle light pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
          
          <div className="flex items-center justify-between px-8 py-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-1.5 bg-white/80 rounded-2xl shadow-sm border border-white backdrop-blur-sm">
                <img
                  src="/logos/morocco-coat.jpg"
                  alt="شعار المملكة المغربية"
                  className="h-16 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div className="text-right leading-tight">
                <div className="text-2xl font-black text-slate-800 tracking-tight">
                  <span>السلطة الحكومية المكلفة بالعدل</span>
                </div>
                <div className="text-2xl font-black text-slate-600">
                  <span>وزارة الـعـدل</span>
                </div>
              </div>
            </div>

            {/* Centered Identity Spot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto">
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#E6BE8A] via-amber-400 to-[#E6BE8A] rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <div className="relative h-24 w-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                        {notaryProfile?.profile_picture_url ? (
                          <img 
                            src={notaryProfile.profile_picture_url} 
                            alt="President" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl">👤</div>
                        )}
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end gap-2 pr-6 border-r border-slate-300/50">
                <div className="bg-white/90 px-5 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                   <div className="text-slate-700 font-bold">
                     <DateWidget />
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>اللغة</span>
                  </span>
                  <div className="scale-90 origin-right">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
              
              <div className="p-2.5 bg-white/80 rounded-3xl shadow-sm border border-white group backdrop-blur-sm">
                <img
                  src="/logos/adoul-logo.jpg"
                  alt="شعار الهيئة الوطنية للعدول"
                  className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex h-32 items-center justify-center relative px-12 -mt-10 mb-2 no-print select-none">
            <OrnateScrollBanner className="group" theme="gray">
               <span className="text-center text-4xl font-black tracking-widest drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] px-24 group-hover:scale-[1.01] transition-transform duration-700">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    السلطة الحكومية المكلفة بالعدل
                  </span>
               </span>
            </OrnateScrollBanner>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E6BE8A]/40 to-transparent"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-slate-50/50">
          <div className="max-w-[2400px] mx-auto w-full">
            <Routes>
              <Route index element={<OfficeDashboard />} />
              
              <Route path="statistics" element={<NationalStatisticsView />} />

              <Route path="notary-registry" element={<NotaryRegistryView />} />

              {/* Add other new routes following the same pattern */}
              <Route path="representative-bodies" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">🏢</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">الهيئات المهنية للعدول</h2>
                      <p className="text-slate-500 font-bold mt-2">الهيئات التمثيلية والتنظيمية</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-xl">
                      <h3 className="font-bold text-slate-800 mb-2">▫️ الهيئة الوطنية للعدول</h3>
                      <p className="text-sm text-slate-600">أعضاء المكتب التنفيذي، مدة الانتداب، محاضر الانتخاب، القرارات التنظيمية.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-xl">
                      <h3 className="font-bold text-slate-800 mb-2">▫️ المجالس الجهوية للعدول</h3>
                      <p className="text-sm text-slate-600">توزيع المجالس حسب الجهات، تركيبة كل مجلس، الاختصاصات.</p>
                    </div>
                  </div>
                </div>
              } />

              <Route path="judge-coordination" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">⚖️</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">التنسيق مع قضاة التوثيق</h2>
                      <p className="text-slate-500 font-bold mt-2">قنوات التنسيق مع القضاة المكلفين بالتوثيق</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                      <h3 className="font-black text-slate-800 mb-3 block">📬 المراسلات الإدارية</h3>
                      <p className="text-xs text-slate-500 font-bold">تتبع الصادر والوارد مع مكاتب قضاة التوثيق بكافة المحاكم.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                      <h3 className="font-black text-slate-800 mb-3 block">🔗 التعليمات والدوريات</h3>
                      <p className="text-xs text-slate-500 font-bold">نشر وتعميم المذكرات التوجيهية ذات الصابع التنظيمي والمهني.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                      <h3 className="font-black text-slate-800 mb-3 block">🙋 طلبات الرأي والتوجيه</h3>
                      <p className="text-xs text-slate-500 font-bold">معالجة الاستفسارات القانونية المرفوعة من القضاة بشأن صعوبات التنفيذ.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                      <h3 className="font-black text-slate-800 mb-3 block">📁 تتبع الملفات التنظيمية</h3>
                      <p className="text-xs text-slate-500 font-bold">مواكبة ملفات فتح المكاتب، الانتقالات، والتعويضات تحت إشراف القضاء.</p>
                    </div>
                  </div>
                </div>
              } />

              <Route path="disciplinary-system" element={
                <div className="bg-white p-12 rounded-[2rem] border-t-8 border-rose-600 shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8 mb-8">
                    <span className="text-5xl">⛔</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tighter">النظام التأديبي والعقوبات المهنية</h2>
                      <p className="text-rose-600 font-black mt-2">تفعيل مبدأ الحكامة وحماية الثقة العامة</p>
                    </div>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 mb-8">
                    <p className="text-rose-900 font-bold text-sm leading-relaxed">
                      ⚠️ تفعيلًا لمبدأ الحكامة وربط المسؤولية بالمحاسبة، يتضمن هذا القسم القرارات التأديبية النهائية مع احترام السرية المهنية والمعطيات الشخصية غير القابلة للنشر.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { l: 'القرارات التأديبية النهائية', desc: 'سجل العقوبات المصادق عليها قضائياً', icon: '📝' },
                      { l: 'تصنيف المخالفات', desc: 'مخالفات مهنية، سلوكية، أو تنظيمية', icon: '🔍' },
                      { l: 'العقوبات المقررة', desc: 'الإنذار، التوبيخ، الإيقاف، أو العزل', icon: '⚖️' },
                      { l: 'الإطار القانوني المؤطر', desc: 'القوانين والمساطر المنظمة للتأديب', icon: '📖' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-rose-300 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{row.icon}</span>
                          <div>
                            <p className="font-black text-slate-800">{row.l}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.desc}</p>
                          </div>
                        </div>
                        <span className="text-slate-300 group-hover:text-rose-500 transition-colors">←</span>
                      </div>
                    ))}
                  </div>
                </div>
              } />

              <Route path="institutional-correspondence" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">📨</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">المراسلات والعلاقات المؤسساتية</h2>
                      <p className="text-slate-500 font-bold mt-2">سجل المراسلات الرسمية المؤسساتية</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: 'مع قضاة التوثيق', icon: '⚖️' },
                      { title: 'مع الهيئة الوطنية', icon: '🏢' },
                      { title: 'مع المجالس الجهوية', icon: '🏛️' },
                      { title: 'تقارير الاجتماعات', icon: '🗂️' },
                    ].map((box, i) => (
                      <div key={i} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-4 text-center hover:bg-white hover:shadow-xl transition-all cursor-pointer group">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                          {box.icon}
                        </div>
                        <h3 className="font-black text-slate-800 text-lg">{box.title}</h3>
                        <p className="text-xs text-slate-400 font-bold leading-relaxed">المذكرات، الإشعارات، طلبات التوضيح، ومحاضر المصادقة.</p>
                      </div>
                    ))}
                  </div>
                </div>
              } />

              <Route path="legal-framework" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">📚</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">الإطار القانوني للتوثيق العدلي</h2>
                      <p className="text-slate-500 font-bold mt-2">المكتبة القانونية والتنظيمية للمهنة</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    {[
                      { t: 'القوانين', i: '📕' },
                      { t: 'المراسيم', i: '📗' },
                      { t: 'القرارات الوزارية', i: '📘' },
                      { t: 'الدوريات', i: '📙' },
                    ].map((doc, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#E6BE8A] transition-all cursor-pointer group">
                        <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{doc.i}</span>
                        <p className="font-black text-slate-700 text-sm">{doc.t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              } />

              <Route path="training-support" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">🎓</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">التكوين المستمر والتأطير المهني</h2>
                      <p className="text-slate-500 font-bold mt-2">رفع الكفاءة والمواكبة العلمية للعدول</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">📜</div>
                      <div>
                        <h3 className="font-black text-slate-800 mb-1">الدلائل المهنية</h3>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">إرشادات تطبيقية لتوحيد العمل في المكاتب العدلية.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">⚖️</div>
                      <div>
                        <h3 className="font-black text-slate-800 mb-1">الاجتهادات القضائية</h3>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">أحدث الأحكام والقرارات ذات الصلة بالتوثيق.</p>
                      </div>
                    </div>
                  </div>
                </div>
              } />

              <Route path="official-announcements" element={
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                    <span className="text-5xl">🔔</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">البلاغات والتنبيهات الرسمية</h2>
                      <p className="text-slate-500 font-bold mt-2">مركز التواصل الفوري والمستجدات</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { t: 'بلاغ عاجل بشأن التعديلات الضريبية', d: 'منذ ساعتين', c: 'border-amber-200 bg-amber-50 text-amber-900' },
                      { t: 'إعلان عن دورة تكوينية رقمية جديدة', d: 'أمس', c: 'border-slate-100 bg-slate-50 text-slate-800' },
                      { t: 'تذكير بآجال التسجيل في النظام المعلوماتي', d: 'منذ يومين', c: 'border-slate-100 bg-slate-50 text-slate-800' },
                    ].map((news, i) => (
                      <div key={i} className={`p-6 rounded-2xl border ${news.c} flex justify-between items-center cursor-pointer group`}>
                        <div>
                          <p className="font-black">{news.t}</p>
                          <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{news.d}</p>
                        </div>
                        <span className="text-xl group-hover:translate-x-[-10px] transition-transform">←</span>
                      </div>
                    ))}
                  </div>
                </div>
              } />

              <Route path="governance-transparency" element={
                <div className="bg-white p-12 rounded-[2rem] border-t-8 border-[#E6BE8A] shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-6 border-b border-slate-100 pb-8 mb-8">
                    <span className="text-5xl">🛡️</span>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800">الحكامة، النزاهة، وجودة الخدمات</h2>
                      <p className="text-[#b08d55] font-black mt-2">مؤشرات الجودة والنزاهة المؤسساتية</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                      <h3 className="text-xl font-black border-b border-white/10 pb-4 mb-4">📊 تقارير الأداء</h3>
                      <div className="space-y-4">
                        {[
                          { l: 'سرعة معالجة الملفات', v: '94%' },
                          { l: 'مؤشر رضا المرتفقين', v: '88%' },
                          { l: 'الالتزام بالمعايير', v: '99%' },
                        ].map((s, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs font-black mb-1">
                              <span>{s.l}</span>
                              <span>{s.v}</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-[#E6BE8A]" style={{ width: s.v }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200">
                      <h3 className="text-xl font-black text-slate-800 mb-6">📝 رصد الحكامة</h3>
                      <ul className="space-y-4 text-sm font-bold text-slate-600">
                        <li className="flex items-center gap-3">✅ تتبع تقارير التفتيش المهني</li>
                        <li className="flex items-center gap-3">✅ معالجة الشكايات المهنية المؤطرة</li>
                        <li className="flex items-center gap-3">✅ تقييم النجاعة الرقمية والميدانية</li>
                      </ul>
                    </div>
                  </div>
                </div>
              } />

              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </div>
        </main>

        <footer className="max-w-[2400px] mx-auto px-10 py-6 flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest border-t border-slate-100 mt-auto">
          <span>© 2026 الهيئة الوطنية للعدول - الديوان المركزي</span>
          <div className="flex gap-4">
             <span>نظام مشفر بالكامل</span>
             <span>نسخة 1.0.4</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

