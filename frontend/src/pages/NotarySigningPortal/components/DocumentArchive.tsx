import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Archive, Loader, Eye } from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

interface DocumentArchiveProps {
  searchQuery: string;
  selectedCategory: string;
  onSelectDocument: (id: string) => void;
  selectedDocument: string | null;
  onViewDocument?: (docId: string, docName: string, fileNumber: string, docType: string, createdAt: string) => void;
}

interface Document {
  id: string;
  sequentialNumber: string;
  recordNumber: string;
  inclusionDate: string;
  parties: string;
  idLast4: string;
  notaryName: string;
  status: 'signed' | 'pending' | 'archived';
  fileNumber?: string;
  documentType?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'signed':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'pending':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'archived':
      return <Archive className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'signed':
      return 'border-l-4 border-emerald-500 bg-emerald-50/30';
    case 'pending':
      return 'border-l-4 border-amber-500 bg-amber-50/30';
    case 'archived':
      return 'border-l-4 border-blue-500 bg-blue-50/30';
    default:
      return '';
  }
};

const mapStatusDisplay = (status: string | null): 'signed' | 'pending' | 'archived' => {
  if (!status) return 'archived';
  const lower = status.toLowerCase();
  if (lower === 'signed' || lower === 'finalized') return 'signed';
  if (lower === 'pending') return 'pending';
  return 'archived';
};

export const DocumentArchive: React.FC<DocumentArchiveProps> = ({
  searchQuery,
  selectedCategory,
  onSelectDocument,
  selectedDocument,
  onViewDocument,
}) => {
  const { sessionToken } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  // Fetch saved rasms based on selected category
  const { data: rasms = [], isLoading } = trpc.feesAgent.documents.listSavedRasms.useQuery(
    {
      sessionToken: sessionToken || '',
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    },
    { enabled: !!sessionToken }
  );

  // Transform rasms to Document format
  const documents: Document[] = useMemo(() => {
    return (rasms as any[]).map((rasm: any, index: number) => ({
      id: rasm.id,
      sequentialNumber: String(index + 1).padStart(3, '0'),
      recordNumber: rasm.fileNumber || `REC-${rasm.id.slice(0, 8)}`,
      inclusionDate: new Date(rasm.createdAt).toLocaleDateString('ar-SA'),
      parties: (rasm.payload as any)?.parties || 'بيانات غير محددة',
      idLast4: (rasm.payload as any)?.idLast4 || '****',
      notaryName: rasm.notaryName || 'غير محدد',
      status: mapStatusDisplay(rasm.status),
      fileNumber: rasm.fileNumber || undefined,
      documentType: rasm.documentType || undefined,
    }));
  }, [rasms]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        doc.sequentialNumber.includes(searchQuery) ||
        doc.recordNumber.toLowerCase().includes(searchLower) ||
        doc.parties.toLowerCase().includes(searchLower) ||
        doc.idLast4.includes(searchQuery) ||
        doc.notaryName.toLowerCase().includes(searchLower);

      return matchesSearch;
    });
  }, [documents, searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-bold">جاري تحميل الوثائق...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedDocuments.length > 0 ? (
          paginatedDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className={`bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer group hover:shadow-md ${
                selectedDocument === doc.id
                  ? 'border-blue-600 shadow-lg'
                  : 'border-slate-200 hover:border-blue-300'
              } ${getStatusColor(doc.status)} p-6`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">#{doc.sequentialNumber}</p>
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1">
                      {doc.recordNumber}
                    </p>
                  </div>
                  {getStatusIcon(doc.status)}
                </div>

                {/* Info Grid */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">التاريخ</span>
                    <span className="font-bold text-slate-900">{doc.inclusionDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">الأطراف</span>
                    <span className="font-bold text-slate-900 text-right line-clamp-1">
                      {doc.parties}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">الرقم</span>
                    <span className="font-bold text-slate-900">****{doc.idLast4}</span>
                  </div>
                </div>

                {/* Notary */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase mb-1">الموثق</p>
                  <p className="text-sm font-bold text-slate-900">{doc.notaryName}</p>
                </div>

                {/* View Document Button */}
                {onViewDocument && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDocument(
                        doc.id,
                        doc.recordNumber,
                        doc.fileNumber || doc.recordNumber,
                        doc.documentType || 'وثيقة',
                        doc.inclusionDate
                      );
                    }}
                    className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    عرض الوثيقة
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-12 text-center">
            <p className="text-slate-600 font-bold">لا توجد وثائق تطابق البحث</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-8 h-8 rounded-lg font-bold transition-colors ${
                  currentPage === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Info */}
      <div className="text-center text-sm text-slate-600">
        عرض {paginatedDocuments.length} من {filteredDocuments.length} وثيقة
      </div>
    </div>
  );
};

