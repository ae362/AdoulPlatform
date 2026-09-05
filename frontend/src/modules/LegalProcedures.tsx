import React, { useState } from 'react';

const procedures = [
  { title: 'مساطر التسجيل', content: 'خطوات التسجيل و الأداء الضريبي، مع تذكير بمهل الأداء.', icon: '📝', category: 'المالية' },
  { title: 'الزواج والطلاق', content: 'ملخص لمقتضيات مدونة الأسرة الخاصة بالزواج والطلاق.', icon: '💍', category: 'الأسرة' },
  { title: 'الأملاك والتحفيظ', content: 'إجراءات التحفيظ العقاري، التنبر، والتحملات.', icon: '🏡', category: 'العقار' },
  { title: 'الإرث والوصايا', content: 'مساطر تصفية التركات وتوثيق الوصايا الشرعية.', icon: '📜', category: 'المواريث' },
  { title: 'القاصرين والنيابة الشرعية', content: 'إجراءات تعيين المقدمين والوصي على القاصرين.', icon: '👶', category: 'الأسرة' },
  { title: 'التوثيق التجاري', content: 'نماذج العقود التجارية والشركات والمساطر المهنية.', icon: '💼', category: 'التجارة' },
];

export function LegalProceduresModule() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProcedures = procedures.filter(p => 
    p.title.includes(searchQuery) || p.content.includes(searchQuery) || p.category.includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto p-4">
      {/* Search Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-3xl font-black text-gray-800 mb-6 font-maghribi">المساطر القانونية والدليل المهني</h2>
        
        <div className="relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </div>
          <input
            type="text"
            placeholder="ابحث عن مسطرة قانونية أو موضوع معين..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pr-12 pl-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Results Grid */}
      {filteredProcedures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProcedures.map((p) => (
            <div 
              key={p.title} 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-blue-200 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl group-hover:scale-110 transition-transform">{p.icon}</div>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">{p.category}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{p.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{p.content}</p>
              
              <div className="flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
                اقرأ المزيد <span className="mr-1">←</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 text-lg font-medium">لا توجد مساطر تطابق بحثك حالياً</p>
        </div>
      )}
    </div>
  );
}

