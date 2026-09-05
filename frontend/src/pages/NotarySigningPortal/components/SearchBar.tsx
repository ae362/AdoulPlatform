import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: 'all', label: '☑ كل الأقسام' },
  { id: 'marriage', label: '☑ الزواج' },
  { id: 'divorce', label: '☑ الطلاق' },
  { id: 'property', label: '☑ الأملاك' },
  { id: 'estate', label: '☑ التركات' },
  { id: 'other', label: '☑ باقي الوثائق' },
];

const searchFields = [
  { placeholder: 'الرقم التسلسلي', icon: '🔢' },
  { placeholder: 'رقم السجل', icon: '📚' },
  { placeholder: 'الاسم الكامل', icon: '👥' },
  { placeholder: 'البطاقة الوطنية', icon: '🪪' },
  { placeholder: 'التاريخ', icon: '📅' },
  { placeholder: 'اسم العدل', icon: '👨‍⚖️' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasQuery = searchQuery.length > 0;

  return (
    <div className="space-y-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Search className="w-5 h-5 text-blue-500" />
        </div>
        <input
          type="text"
          placeholder="🔍 البحث برقم الرسم أو البطاقة أو الاسم أو تاريخ التضمين..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-6 py-3.5 pl-12 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-500 font-medium transition-all"
        />
        {hasQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute left-12 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
            showFilters
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
          }`}
        >
          <Filter className="w-4 h-4" />
          الفلاتر
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
            showAdvanced
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400'
          }`}
        >
          <Search className="w-4 h-4" />
          بحث متقدم
        </button>

        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          עברת {searchQuery.length > 0 ? `"${searchQuery.substring(0, 20)}${searchQuery.length > 20 ? '...' : ''}"` : 'لا يوجد بحث نشط'}
        </div>
      </div>

      {/* Category Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-4 border-t border-slate-200">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3 py-2.5 rounded-lg font-bold text-xs transition-all border-2 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Advanced Search */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-200">
          {searchFields.map((field, idx) => (
            <div key={idx} className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base">
                {field.icon}
              </span>
              <input
                type="text"
                placeholder={field.placeholder}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Quick Tips */}
      <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
        <span>💡</span>
        <span>
          يمكنك البحث عبر: الرقم التسلسلي • رقم السجل • الاسم الكامل • البطاقة الوطنية • التاريخ • اسم العدل
        </span>
      </div>
    </div>
  );
};
