import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface DocumentFile {
  file: File;
  preview: string;
  subject: 'husband' | 'wife' | 'other';
  base64?: string;
}

interface DocumentUploaderProps {
  onDocumentsChange: (documents: DocumentFile[]) => void;
  maxFiles?: number;
}

export function DocumentUploader({ onDocumentsChange, maxFiles = 10 }: DocumentUploaderProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newDocs: DocumentFile[] = [];
      const currentCount = documents.length;

      for (let i = 0; i < Math.min(files.length, maxFiles - currentCount); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const preview = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        
        newDocs.push({
          file,
          preview,
          subject: 'other',
          base64,
        });
      }

      const updated = [...documents, ...newDocs];
      setDocuments(updated);
      onDocumentsChange(updated);
    },
    [documents, maxFiles, onDocumentsChange]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const removeDocument = (index: number) => {
    URL.revokeObjectURL(documents[index].preview);
    const updated = documents.filter((_, i) => i !== index);
    setDocuments(updated);
    onDocumentsChange(updated);
  };

  const updateSubject = (index: number, subject: 'husband' | 'wife' | 'other') => {
    const updated = [...documents];
    updated[index].subject = subject;
    setDocuments(updated);
    onDocumentsChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition ${
          dragActive
            ? 'border-red-900 bg-red-50'
            : 'border-slate-300 bg-slate-50 hover:border-red-700 hover:bg-slate-100'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={documents.length >= maxFiles}
        />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-red-900">انقر للتحميل</span> أو اسحب الملفات هنا
          </div>
          <p className="text-xs text-slate-500">
            صور فقط (PNG, JPG, JPEG) - الحد الأقصى {maxFiles} ملفات
          </p>
          <p className="text-xs text-slate-400">
            {documents.length} / {maxFiles} ملفات محملة
          </p>
        </div>
      </div>

      {/* Document Previews */}
      {documents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, index) => (
            <div key={index} className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
              {/* Preview Image */}
              <div className="relative aspect-video overflow-hidden rounded-md bg-slate-100">
                <img
                  src={doc.preview}
                  alt={doc.file.name}
                  className="h-full w-full object-cover"
                />
                {/* Remove Button */}
                <button
                  onClick={() => removeDocument(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 transition hover:bg-red-700 group-hover:opacity-100"
                  title="حذف"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* File Info */}
              <div className="mt-2 space-y-2">
                <p className="truncate text-xs text-slate-600" title={doc.file.name}>
                  {doc.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(doc.file.size / 1024).toFixed(1)} KB
                </p>

                {/* Subject Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نوع الوثيقة:
                  </label>
                  <select
                    value={doc.subject}
                    onChange={(e) => updateSubject(index, e.target.value as 'husband' | 'wife' | 'other')}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-red-900 focus:outline-none focus:ring-1 focus:ring-red-900"
                  >
                    <option value="husband">وثائق الزوج</option>
                    <option value="wife">وثائق الزوجة</option>
                    <option value="other">وثائق أخرى</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
