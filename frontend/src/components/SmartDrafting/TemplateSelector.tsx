import React from 'react';
import { trpc } from '../../trpc';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, onCancel }) => {
  const { data: templates, isLoading, error } = trpc.smartDrafting.listTemplates.useQuery();

  if (isLoading) return <div className="p-8 text-center">جاري تحميل النماذج...</div>;
  if (error) return <div className="p-8 text-center text-red-600">حدث خطأ أثناء تحميل النماذج</div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">اختر نموذجاً عدلياً</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="flex flex-col items-start p-6 border-2 border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-right group"
            >
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">📜</span>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500">نموذج معتمد غير قابل للتعديل</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
