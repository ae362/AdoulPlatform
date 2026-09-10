import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractTemplateSchema, type ContractTemplate } from '../../../shared/schemas';
import { trpc } from '../trpc';

export function ContractTemplatesModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const utils = trpc.useUtils();
  const { data } = trpc.contractTemplates.list.useQuery();
  const create = trpc.contractTemplates.create.useMutation({ onSuccess: () => utils.contractTemplates.list.invalidate() });
  const update = trpc.contractTemplates.update.useMutation({ onSuccess: () => utils.contractTemplates.list.invalidate() });
  const remove = trpc.contractTemplates.delete.useMutation({ onSuccess: () => utils.contractTemplates.list.invalidate() });
  const aiSuggest = trpc.contractTemplates.aiSuggest.useMutation();
  const { register, handleSubmit, reset, setValue } = useForm<ContractTemplate>({ resolver: zodResolver(contractTemplateSchema) });

  const onSubmit = handleSubmit((values) => {
    if (values.id) update.mutate(values);
    else create.mutate(values, { onSuccess: () => reset() });
  });

  const runSuggest = async () => {
    const res = await aiSuggest.mutateAsync({ topic: 'adliyyah-template' });
    if (res?.length) setValue('content', res.map((r) => (r as any).preview || r.snippet || '').join('\n'));
  };

  const filteredData = data?.filter(row => 
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    row.template_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-fadeIn">
      {/* Header & Search */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-3xl font-black font-maghribi mb-2">مستودع نماذج العقود</h3>
            <p className="text-slate-300 text-sm">إدارة وتخصيص مسودات العقود والوثائق الرسمية</p>
          </div>
          <div className="relative flex-grow max-w-md">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="ابحث في النماذج المسجلة..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 sticky top-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">➕</span> إضافة نموذج جديد
            </h3>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اسم النموذج</label>
                <input className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="مثلا: عقد بيع عقاري" {...register('name')} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نوع النموذج</label>
                <input className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="تصنيف النموذج" {...register('template_type')} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">محتوى المسودة</label>
                <textarea className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 h-48 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="نص النموذج مع استخدام المتغيرات..." {...register('content')} />
              </div>
              
              <div className="pt-4 flex flex-col gap-3">
                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all" type="submit">
                  حفظ النموذج
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-all text-sm" type="button" onClick={runSuggest}>
                    🪄 اقتراح ذكي
                  </button>
                  <button className="py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm" type="button" onClick={() => reset()}>
                    ♻️ إفراغ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Registered Templates List */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <h4 className="mb-6 text-xl font-bold flex items-center gap-2">
              <span className="p-2 bg-slate-50 text-slate-600 rounded-lg">📋</span> النماذج المسجلة ({filteredData?.length || 0})
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredData?.map((row) => (
                <div key={row.id} className="group border border-gray-100 rounded-2xl p-4 hover:bg-blue-50/50 hover:border-blue-200 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 bg-blue-500 h-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{row.name}</h5>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">{row.template_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-grow italic">{row.content?.substring(0, 100)}...</p>
                    <div className="flex gap-2 pt-2 border-t border-gray-50 group-hover:border-blue-100 transition-colors">
                      <button className="flex-grow py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50" onClick={() => reset(row)}>تعديل</button>
                      <button className="flex-grow py-2 bg-white border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50" onClick={() => remove.mutate({ id: row.id! })}>حذف</button>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!filteredData || filteredData.length === 0) && (
                <div className="col-span-full py-12 text-center text-gray-400">
                  <p className="text-sm font-medium italic">لا توجد نماذج تطابق بحثك</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

