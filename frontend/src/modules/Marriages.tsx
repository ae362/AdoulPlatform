import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { marriageRecordSchema, type MarriageRecord } from '../../../shared/schemas';
import { trpc } from '../trpc';
import { DocumentUploader, type DocumentFile } from '../components/DocumentUploader';

const marriageTypeLabel: Record<MarriageRecord['record_type'], string> = {
  adult: 'زواج الراشد',
  minor: 'زواج القاصر',
  mixed: 'زواج مختلط',
  disabled: 'زواج ذوي الإعاقة',
};

const marriageFeeTypes = ['زواج', 'تجديد زواج', 'مراجعة', 'استمرار زواج', 'تعدد'];

export function MarriagesModule() {
  const utils = trpc.useUtils();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visionStatus, setVisionStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  const { data: marriageList } = trpc.marriageRecords.list.useQuery();
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, { refetchOnWindowFocus: false });
  
  const visionCheck = trpc.ocr.checkVisionAvailability.useQuery(undefined, {
    enabled: visionStatus === 'idle',
    refetchOnMount: false,
  });

  const processDocuments = trpc.ocr.processMarriageDocuments.useMutation();
  const createMarriage = trpc.marriageRecords.create.useMutation({
    onSuccess: () => {
      utils.marriageRecords.list.invalidate();
      reset(defaultValues);
      setDocuments([]);
      alert('تم إضافة رسم الزواج بنجاح');
    },
    onError: (error) => alert(`خطأ: ${error.message}`),
  });

  const updateMarriage = trpc.marriageRecords.update.useMutation({
    onSuccess: () => {
      utils.marriageRecords.list.invalidate();
      alert('تم تحديث رسم الزواج بنجاح');
    },
    onError: (error) => alert(`خطأ: ${error.message}`),
  });

  const deleteMarriage = trpc.marriageRecords.delete.useMutation({
    onSuccess: () => utils.marriageRecords.list.invalidate(),
  });

  useEffect(() => {
    if (visionCheck.data) {
      setVisionStatus(visionCheck.data.available ? 'available' : 'unavailable');
    }
  }, [visionCheck.data]);

  const defaultValues: Partial<MarriageRecord> = {
    record_type: 'adult',
    fee_type: 'زواج',
    inclusion_date: now?.gregorian.slice(0, 10),
    inclusion_hijri: now?.hijri,
  };

  const { register, handleSubmit, reset, setValue, watch } = useForm<MarriageRecord>({
    resolver: zodResolver(marriageRecordSchema),
    defaultValues,
  });

  const currentId = watch('id');
  const recordType = watch('record_type');

  // Auto-fill from vision AI using GPT-OSS cloud model
  const handleAutoFill = useCallback(async () => {
    if (documents.length === 0) {
      alert('الرجاء تحميل المستندات أولاً');
      return;
    }

    setIsProcessing(true);
    try {
      const docs = documents.map((doc) => ({
        base64: doc.base64!,
        subject: doc.subject,
        filename: doc.file.name,
      }));

      // Process with GPT-OSS cloud vision model
      const result = await processDocuments.mutateAsync({ documents: docs });

      // Auto-fill form fields from AI extraction
      if (result.extractedData) {
        Object.entries(result.extractedData).forEach(([key, value]) => {
          if (value) {
            setValue(key as keyof MarriageRecord, value as any);
          }
        });

        // Update documents with OCR metadata for storage
        const updatedDocs = documents.map(doc => ({
          ...doc,
          ocrData: result.extractedData
        }));
        setDocuments(updatedDocs);

        const fieldCount = Object.keys(result.extractedData).length;
        alert(`✓ تم استخراج ${fieldCount} حقل من المستندات باستخدام ${result.provider || 'LLaVA Vision'}`);
      } else {
        alert('⚠ لم يتم استخراج بيانات واضحة - يرجى المراجعة اليدوية');
      }
    } catch (error) {
      console.error('Vision processing error:', error);
      alert(`خطأ في معالجة المستندات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [documents, processDocuments, setValue]);

  const onSubmit = handleSubmit((values) => {
    const payload = {
      ...values,
      uploaded_files: documents.map((doc) => ({
        name: doc.file.name,
        base64: doc.base64!,
        type: doc.file.type,
        size: doc.file.size,
        subject: doc.subject,
        // Include OCR extracted data with each document
        ocr_detected_fields: (doc as any).ocrData || {},
      })),
    };

    if (values.id) {
      updateMarriage.mutate(payload);
    } else {
      createMarriage.mutate(payload);
    }
  });

  const handleEdit = (record: MarriageRecord) => {
    reset(record);
    setDocuments([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="text-2xl font-bold text-slate-900">سجلات الزواج</h2>
        <p className="mt-2 text-sm text-slate-600">
          إدارة رسوم الزواج مع استخراج البيانات التلقائي من المستندات
        </p>
        
        {/* Vision Status */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-medium">حالة الذكاء الاصطناعي:</span>
          {visionStatus === 'available' && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
              ✓ متاح ({visionCheck.data?.model})
            </span>
          )}
          {visionStatus === 'unavailable' && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800">
              ⚠ غير متاح - سيتم استخدام OCR التقليدي
            </span>
          )}
          {visionStatus === 'idle' && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              جاري الفحص...
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        {/* Form Section */}
        <section className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {currentId ? 'تعديل رسم الزواج' : 'إضافة رسم زواج جديد'}
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Document Uploader */}
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">تحميل المستندات</h4>
              <DocumentUploader onDocumentsChange={setDocuments} maxFiles={10} />
              
              {documents.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={isProcessing}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {isProcessing ? 'جاري المعالجة...' : '🤖 ملء تلقائي من المستندات'}
                  </button>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع السجل</label>
                <select className="input" {...register('record_type')}>
                  {Object.entries(marriageTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع الرسم</label>
                <select className="input" {...register('fee_type')}>
                  {marriageFeeTypes.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ التضمين</label>
                <input className="input" type="date" {...register('inclusion_date')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ الهجري</label>
                <input className="input" placeholder="التاريخ الهجري" {...register('inclusion_hijri')} />
              </div>
            </div>

            {/* Husband Info */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-blue-900">بيانات الزوج</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" placeholder="الاسم الكامل" {...register('husband_name')} />
                <input className="input" placeholder="رقم البطاقة الوطنية" {...register('husband_cin')} />
                <input className="input" type="date" placeholder="تاريخ الميلاد" {...register('husband_birth_date')} />
                <input className="input" placeholder="الجنسية" {...register('husband_nationality')} />
                <input className="input" placeholder="السكن" {...register('husband_residence')} />
                <input className="input" placeholder="الحالة الاجتماعية" {...register('husband_marital_status')} />
              </div>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" {...register('husband_is_muslim')} />
                  مسلم
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" {...register('is_minor_husband')} />
                  قاصر
                </label>
              </div>
            </div>

            {/* Wife Info */}
            <div className="rounded-lg bg-pink-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-pink-900">بيانات الزوجة</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" placeholder="الاسم الكامل" {...register('wife_name')} />
                <input className="input" placeholder="رقم البطاقة الوطنية" {...register('wife_cin')} />
                <input className="input" type="date" placeholder="تاريخ الميلاد" {...register('wife_birth_date')} />
                <input className="input" placeholder="الجنسية" {...register('wife_nationality')} />
                <input className="input" placeholder="السكن" {...register('wife_residence')} />
                <input className="input" placeholder="الحالة الاجتماعية" {...register('wife_marital_status')} />
              </div>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" {...register('wife_is_muslim')} />
                  مسلمة
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" {...register('is_minor_wife')} />
                  قاصرة
                </label>
              </div>
            </div>

            {/* Conditional Fields */}
            {recordType === 'minor' && (
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" placeholder="رقم ملف إذن الخاطب" {...register('minor_husband_permit_file_no')} />
                <input className="input" placeholder="رقم ملف إذن المخطوبة" {...register('minor_wife_permit_file_no')} />
              </div>
            )}

            {recordType === 'mixed' && (
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" placeholder="رقم جواز الخاطب" {...register('mixed_marriage_husband_passport_no')} />
                <input className="input" placeholder="رقم جواز المخطوبة" {...register('mixed_marriage_wife_passport_no')} />
              </div>
            )}

            {recordType === 'disabled' && (
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input" placeholder="نوع إعاقة الخاطب" {...register('husband_disability_type')} />
                <input className="input" placeholder="نوع إعاقة المخطوبة" {...register('wife_disability_type')} />
              </div>
            )}

            {/* Additional Fields */}
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" placeholder="رقم إذن التزوج" {...register('marriage_authorization_no')} />
              <input
                className="input"
                type="number"
                placeholder="مبلغ الصداق"
                {...register('dowry_amount', { valueAsNumber: true })}
              />
            </div>

            <textarea className="input" rows={2} placeholder="المحرر" {...register('contracted_by')} />
            <textarea className="input" rows={2} placeholder="ملاحظات" {...register('notes')} />

            {/* Registry Info */}
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">ضمن كناش الزواج</h4>
              <div className="grid gap-3 md:grid-cols-4">
                <input className="input" placeholder="نوع الكناش" {...register('registry_book_type')} />
                <input
                  className="input"
                  type="number"
                  placeholder="رقم"
                  {...register('registry_number', { valueAsNumber: true })}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="عدد"
                  {...register('registry_count', { valueAsNumber: true })}
                />
                <input className="input" placeholder="حرف" {...register('registry_letter')} />
              </div>
              <input
                className="input mt-3"
                type="number"
                placeholder="رقم الصفحة"
                {...register('registry_page', { valueAsNumber: true })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn-primary flex-1">
                {currentId ? 'تحديث' : 'إضافة'}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset(defaultValues);
                  setDocuments([]);
                }}
                className="btn-secondary"
              >
                مسح
              </button>
              {currentId && (
                <button
                  type="button"
                  onClick={() => currentId && deleteMarriage.mutate({ id: currentId })}
                  className="btn-danger"
                >
                  حذف
                </button>
              )}
            </div>
          </form>
        </section>

        {/* List Section */}
        <section className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">قائمة سجلات الزواج</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-right">النوع</th>
                  <th className="p-2 text-right">التاريخ</th>
                  <th className="p-2 text-right">الزوج</th>
                  <th className="p-2 text-right">الزوجة</th>
                  <th className="p-2 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {marriageList?.map((record) => (
                  <tr key={record.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-2">{marriageTypeLabel[record.record_type]}</td>
                    <td className="p-2">{record.inclusion_date}</td>
                    <td className="p-2">
                      <div>{record.husband_name}</div>
                      <div className="text-xs text-slate-500">{record.husband_cin}</div>
                    </td>
                    <td className="p-2">
                      <div>{record.wife_name}</div>
                      <div className="text-xs text-slate-500">{record.wife_cin}</div>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleEdit(record as MarriageRecord)}
                        className="btn-secondary text-xs"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
                {!marriageList?.length && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      لا توجد سجلات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
