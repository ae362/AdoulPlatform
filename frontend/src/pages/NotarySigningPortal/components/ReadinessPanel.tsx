import React, { useState, useEffect } from 'react';
import {
  Heart,
  Scroll,
  Home,
  Scale,
  FileStack,
  Search,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

interface CategoryData {
  id: string;
  title: string;
  icon: React.ElementType;
  totalSigned: number;
  totalPending: number;
  totalArchived: number;
  color: string;
}

const categoryConfig: { [key: string]: CategoryData } = {
  'marriage': {
    id: 'marriage',
    title: '💍 رسوم الزواج',
    icon: Heart,
    totalSigned: 0,
    totalPending: 0,
    totalArchived: 0,
    color: 'from-pink-500 to-rose-500',
  },
  'divorce': {
    id: 'divorce',
    title: '📜 رسوم الطلاق',
    icon: Scroll,
    totalSigned: 0,
    totalPending: 0,
    totalArchived: 0,
    color: 'from-orange-500 to-amber-500',
  },
  'property': {
    id: 'property',
    title: '🏠 رسوم الأملاك',
    icon: Home,
    totalSigned: 0,
    totalPending: 0,
    totalArchived: 0,
    color: 'from-emerald-500 to-teal-500',
  },
  'estate': {
    id: 'estate',
    title: '⚖ رسوم التركات',
    icon: Scale,
    totalSigned: 0,
    totalPending: 0,
    totalArchived: 0,
    color: 'from-indigo-500 to-blue-500',
  },
  'other': {
    id: 'other',
    title: '📁 باقي الوثائق',
    icon: FileStack,
    totalSigned: 0,
    totalPending: 0,
    totalArchived: 0,
    color: 'from-slate-500 to-gray-500',
  },
};

interface ReadinessPanelProps {
  onSelectCategory: (category: string) => void;
}

export const ReadinessPanel: React.FC<ReadinessPanelProps> = ({ onSelectCategory }) => {
  const { sessionToken } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [totals, setTotals] = useState({ signed: 0, pending: 0, archived: 0, total: 0 });

  // Fetch all saved rasms to calculate statistics
  const { data: allRasms, isLoading, error } = trpc.feesAgent.documents.listSavedRasms.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken }
  );

  useEffect(() => {
    if (allRasms) {
      // Calculate statistics by category and status
      const stats: { [key: string]: { signed: number; pending: number; archived: number } } = {
        marriage: { signed: 0, pending: 0, archived: 0 },
        divorce: { signed: 0, pending: 0, archived: 0 },
        property: { signed: 0, pending: 0, archived: 0 },
        estate: { signed: 0, pending: 0, archived: 0 },
        other: { signed: 0, pending: 0, archived: 0 },
      };

      let totalSigned = 0, totalPending = 0, totalArchived = 0;

      allRasms.forEach((rasm) => {
        const category = rasm.documentType || 'other';
        const status = rasm.status || 'DRAFT';

        if (stats[category]) {
          if (status === 'signed' || status === 'FINALIZED') {
            stats[category].signed++;
            totalSigned++;
          } else if (status === 'pending' || status === 'PENDING') {
            stats[category].pending++;
            totalPending++;
          } else {
            stats[category].archived++;
            totalArchived++;
          }
        } else {
          // Unknown category goes to 'other'
          if (status === 'signed' || status === 'FINALIZED') {
            stats['other'].signed++;
            totalSigned++;
          } else if (status === 'pending' || status === 'PENDING') {
            stats['other'].pending++;
            totalPending++;
          } else {
            stats['other'].archived++;
            totalArchived++;
          }
        }
      });

      // Update categories with calculated data
      const updatedCategories = Object.keys(categoryConfig).map((key) => ({
        ...categoryConfig[key],
        totalSigned: stats[key].signed,
        totalPending: stats[key].pending,
        totalArchived: stats[key].archived,
      }));

      setCategories(updatedCategories);
      setTotals({
        signed: totalSigned,
        pending: totalPending,
        archived: totalArchived,
        total: allRasms.length,
      });
    }
  }, [allRasms]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-bold">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-red-900">خطأ في تحميل البيانات</h3>
          <p className="text-sm text-red-700 mt-1">{(error as any)?.message || 'حدث خطأ غير متوقع'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
          >
            {/* Top Gradient Bar */}
            <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {category.title}
              </h3>

              {/* Stats Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">الموقعة</span>
                  <span className="font-bold text-emerald-600">{category.totalSigned}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">المُخاطب</span>
                  <span className="font-bold text-amber-600">{category.totalPending}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                  <span className="text-slate-600">المؤرشفة</span>
                  <span className="font-bold text-blue-600">{category.totalArchived}</span>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={() => onSelectCategory(category.id)}
                className="w-full mt-4 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-bold text-sm hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 border border-purple-200"
              >
                <Search className="w-4 h-4" />
                البحث
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-4 gap-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-center">
          <p className="text-3xl font-black text-blue-600">{totals.signed}</p>
          <p className="text-xs text-slate-600 mt-2">إجمالي الموقعة</p>
        </div>
        <div className="text-center border-l border-r border-slate-200">
          <p className="text-3xl font-black text-amber-600">{totals.pending}</p>
          <p className="text-xs text-slate-600 mt-2">المُخاطب عليها</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-emerald-600">{totals.archived}</p>
          <p className="text-xs text-slate-600 mt-2">المؤرشفة نهائياً</p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-2xl font-black text-purple-600">
            {totals.total > 0 ? ((totals.signed / totals.total) * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-xs text-slate-600 mt-2">نسبة الإتمام</p>
        </div>
      </div>
    </div>
  );
};
