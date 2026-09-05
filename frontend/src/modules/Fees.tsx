import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  marriageRecordSchema,
  type MarriageRecord,
  type MarriageDocument,
  type MarriageDocumentSubject,
  divorceRecordSchema,
  type DivorceRecord,
  propertyFeeSchema,
  type PropertyFee,
  inheritanceFeeSchema,
  type InheritanceFee,
  otherDocumentFeeSchema,
  type OtherDocumentFee,
} from '../../../shared/schemas';
import type { OCRResult } from '../../../shared';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { SearchFeesModule } from './SearchFees';
import { InteractivePdfEditor } from '../components/InteractivePdfEditor';
import { DEFAULT_INTERACTIVE_DOCUMENT_PAGES } from '../components/templates/interactivePageTemplates';
import { FeesAgent, type FeesAgentState } from './FeesAgent';

type LocalDocumentSelection = { name: string; url: string; isObjectUrl?: boolean };
type PendingUploadFile = { name: string; type: string; size: number; base64: string };
type PendingMarriageDocument = PendingUploadFile & {
  id: string;
  objectUrl: string;
  subject: MarriageDocumentSubject;
  ocrStatus: 'idle' | 'processing' | 'success' | 'error';
  ocrResult?: OCRResult;
  error?: string;
};

const marriageDocumentSubjectOptions: { value: MarriageDocumentSubject; label: string }[] = [
  { value: 'husband', label: 'وثيقة الزوج' },
  { value: 'wife', label: 'وثيقة الزوجة' },
  { value: 'other', label: 'وثيقة أخرى' },
];

type MarriageAutofillField =
  | 'husband_name'
  | 'wife_name'
  | 'husband_cin'
  | 'wife_cin'
  | 'husband_birth_date'
  | 'wife_birth_date'
  | 'husband_nationality'
  | 'wife_nationality'
  | 'husband_residence'
  | 'wife_residence';

const ocrFieldMappings: {
  keywords: string[];
  husbandField: MarriageAutofillField;
  wifeField: MarriageAutofillField;
  normalize?: (value: string) => string | undefined;
}[] = [
  { keywords: ['name', 'full_name', 'nom', 'prenom'], husbandField: 'husband_name', wifeField: 'wife_name' },
  { keywords: ['cin', 'id', 'national_id', 'identity'], husbandField: 'husband_cin', wifeField: 'wife_cin' },
  {
    keywords: ['dob', 'birth', 'birthdate', 'birth_date', 'date_naissance'],
    husbandField: 'husband_birth_date',
    wifeField: 'wife_birth_date',
    normalize: normalizeOcrDate,
  },
  {
    keywords: ['nationality', 'nationalite', 'nationalidad'],
    husbandField: 'husband_nationality',
    wifeField: 'wife_nationality',
  },
  { keywords: ['residence', 'address', 'domicile'], husbandField: 'husband_residence', wifeField: 'wife_residence' },
];

function normalizeOcrDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashMatch = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }
  return undefined;
}

function resolveFieldFromOcrKey(
  key: string,
  subject: MarriageDocumentSubject | undefined,
): { field: MarriageAutofillField; normalized?: (value: string) => string | undefined } | undefined {
  if (!subject || subject === 'other') return undefined;
  const normalizedKey = key.toLowerCase();
  const mapping = ocrFieldMappings.find((entry) => entry.keywords.some((keyword) => normalizedKey.includes(keyword)));
  if (!mapping) return undefined;
  return {
    field: subject === 'husband' ? mapping.husbandField : mapping.wifeField,
    normalized: mapping.normalize,
  };
}

function generateDocumentId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function convertToHijri(date?: string | null) {
  if (!date) return '';
  const safeDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(safeDate.getTime())) return '';
  return hijriFormatter.format(safeDate);
}

const showSuccessMessage = (message: string) => {
  window.alert(message);
};

const showErrorMessage = (message: string, error?: unknown) => {
  let details = '';
  if (error instanceof Error) {
    details = `: ${error.message}`;
  }
  window.alert(`${message}${details}`);
};

const showInfoMessage = (message: string) => {
  window.alert(message);
};

function deriveSavedRasmPartyNames(payload: Record<string, unknown> | null | undefined): string[] {
  const p = payload && typeof payload === 'object' ? payload : {};
  const names = new Set<string>();

  const pushName = (value: unknown) => {
    const trimmed = String(value || '').trim();
    if (trimmed) names.add(trimmed);
  };

  const pushFromArray = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (item && typeof item === 'object') {
        pushName((item as any).name);
        pushName((item as any).fullName);
        pushName((item as any).full_name);
      }
    });
  };

  pushFromArray((p as any).sellers);
  pushFromArray((p as any).buyers);
  pushFromArray((p as any).applicants);
  pushName((p as any).husband_name);
  pushName((p as any).husbandName);
  pushName((p as any).wife_name);
  pushName((p as any).wifeName);
  pushName((p as any).party1Name);
  pushName((p as any).party2Name);

  const partiesNames = String(
    (p as any).parties_names ||
    (p as any).partiesNames ||
    (p as any).partySummary ||
    (p as any).involvedNames ||
    (p as any).involved_names ||
    ''
  ).trim();
  if (partiesNames) {
    partiesNames
      .split(/[-,،؛|/\n]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => names.add(name));
  }

  return Array.from(names);
}

function normalizeSearchText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s:/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type DocumentFieldOptions = {
  documentUrlField?: string;
  documentNameField?: string;
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
        resolve(base64);
      } else {
        reject(new Error('تعذر تحميل الملف'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('تعذر تحميل الملف'));
    reader.readAsDataURL(file);
  });

function useLocalDocumentField(
  setValue?: (field: string, value: string | undefined) => void,
  fieldName?: string,
  options?: DocumentFieldOptions,
) {
  const [localDocument, setLocalDocument] = useState<LocalDocumentSelection | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUploadFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateField = useCallback(
    (target: string | undefined, value: string | undefined) => {
      if (setValue && target) {
        setValue(target, value ?? '');
      }
    },
    [setValue],
  );

  const resetLocalDocument = useCallback(
    (optionsReset?: { keepFieldValue?: boolean }) => {
      setLocalDocument((previous) => {
        if (previous?.isObjectUrl) {
          URL.revokeObjectURL(previous.url);
        }
        return null;
      });
      setPendingUpload(null);
      if (!optionsReset?.keepFieldValue) {
        updateField(fieldName, '');
        updateField(options?.documentNameField, '');
        updateField(options?.documentUrlField, '');
      }
    },
    [fieldName, options?.documentNameField, options?.documentUrlField, updateField],
  );

  useEffect(() => {
    return () => {
      resetLocalDocument({ keepFieldValue: true });
    };
  }, [resetLocalDocument]);

  const handleFetch = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const base64 = await readFileAsBase64(file);
        const objectUrl = URL.createObjectURL(file);
        setLocalDocument((previous) => {
          if (previous?.isObjectUrl) {
            URL.revokeObjectURL(previous.url);
          }
          return { name: file.name, url: objectUrl, isObjectUrl: true };
        });
        setPendingUpload({
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
        });
        updateField(fieldName, file.name);
        updateField(options?.documentNameField, file.name);
        updateField(options?.documentUrlField, '');
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } finally {
        event.target.value = '';
      }
    },
    [fieldName, options?.documentNameField, options?.documentUrlField, updateField],
  );

  const openLocalDocument = useCallback(() => {
    if (localDocument) {
      window.open(localDocument.url, '_blank', 'noopener,noreferrer');
    }
  }, [localDocument]);

  const setRemoteDocument = useCallback(
    (document?: { name?: string | null; url?: string | null }) => {
      setLocalDocument((previous) => {
        if (previous?.isObjectUrl) {
          URL.revokeObjectURL(previous.url);
        }
        if (document?.name && document?.url) {
          return { name: document.name, url: document.url, isObjectUrl: false };
        }
        return null;
      });
      setPendingUpload(null);
      if (document?.name && document?.url) {
        updateField(fieldName, document.name);
        updateField(options?.documentNameField, document.name);
        updateField(options?.documentUrlField, document.url);
      } else {
        updateField(options?.documentNameField, '');
        updateField(options?.documentUrlField, '');
      }
    },
    [fieldName, options?.documentNameField, options?.documentUrlField, updateField],
  );

  return {
    localDocument,
    pendingUpload,
    fileInputRef,
    handleFetch,
    handleFileChange,
    resetLocalDocument,
    openLocalDocument,
    setRemoteDocument,
  };
}

type FeesTab = 'judicial' | 'marriage' | 'divorce' | 'property' | 'inheritance' | 'other' | 'search' | 'saved';

const marriageTypeLabel: Record<MarriageRecord['record_type'], string> = {
  adult: 'زواج الراشد',
  minor: 'زواج القاصر',
  mixed: 'زواج مختلط',
  disabled: 'زواج ذوي الإعاقة',
};

const marriageFeeTypes = ['زواج', 'تجديد زواج', 'مراجعة', 'استمرار زواج', 'تعدد'];

const defaultMarriageValues: Partial<MarriageRecord> = {
  record_type: 'adult',
  fee_type: 'زواج',
};

type PdfEditorMode = 'template' | 'filled';
type PreviewPaneMode = 'interactive' | 'pdf';

const pdfRecordFieldGroups: {
  title: string;
  fields: { name: keyof MarriageRecord; label: string; inputType?: 'text' | 'date' | 'number' }[];
}[] = [
  {
    title: 'معلومات الخاطب',
    fields: [
      { name: 'husband_name', label: 'الاسم الكامل' },
      { name: 'husband_cin', label: 'رقم البطاقة الوطنية' },
      { name: 'husband_residence', label: 'محل السكنى' },
      { name: 'husband_occupation', label: 'المهنة' },
    ],
  },
  {
    title: 'معلومات المخطوبة',
    fields: [
      { name: 'wife_name', label: 'الاسم الكامل' },
      { name: 'wife_cin', label: 'رقم البطاقة الوطنية' },
      { name: 'wife_residence', label: 'محل السكنى' },
      { name: 'wife_occupation', label: 'المهنة' },
    ],
  },
  {
    title: 'بيانات التواريخ',
    fields: [
      { name: 'inclusion_date', label: 'التاريخ الميلادي', inputType: 'date' },
      { name: 'inclusion_hijri', label: 'التاريخ الهجري' },
      { name: 'marriage_authorization_no', label: 'رقم الإذن بالزواج' },
      { name: 'dowry_amount', label: 'مبلغ الصداق', inputType: 'number' },
    ],
  },
  {
    title: 'معلومات السجل',
    fields: [
      { name: 'registry_book_type', label: 'نوع الكناش' },
      { name: 'registry_number', label: 'رقم الكناش', inputType: 'number' },
      { name: 'registry_count', label: 'عدد', inputType: 'number' },
      { name: 'registry_page', label: 'الصفحة', inputType: 'number' },
    ],
  },
];

const renderInteractiveTemplate = (
  template: string,
  values: Record<string, string | number | undefined>,
) =>
  template.replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    const rawValue = values[key];
    if (rawValue === undefined || rawValue === null) return '';
    return String(rawValue);
  });

const otherDocumentFeeTypes = [
  'وكيل',
  'عقد بيع حق الهواء و التعلية',
  'ملحق تصحيحي',
  'إشهاد',
  'تصحيح مساحة',
  'تصحيح خطأ مادي',
  'اعتراف',
  'إقرار',
  'ثبوت دين',
  'إبراء ذمة',
  'نوع آخر',
  'رسوم كفالة الأطفال المهملين',
];

const propertyFeeTypes = [
  'شراء',
  'ملك',
  'تصرف',
  'حيازة',
  'تسليم بعوض',
  'تسليو بدون عوض',
  'اعتراف',
  'صدقة',
  'هبة',
  'وعد ببيع',
  'تحبيس',
  'عمرى',
  'اقالة',
  'ثبوت بناء',
  'ثبوت استغلال',
  'نحلة',
  'تصيير',
];

const inheritanceFeeTypes = ['اراثة', 'بيان فريضة', 'احصاء متروك'];

 function MarriageSection() {
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState<{ cin?: string; type?: string }>();
  const [cinSearch, setCinSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const { data: list } = trpc.marriageRecords.list.useQuery(filters);
  const create = trpc.marriageRecords.create.useMutation({
    onSuccess: () => {
      utils.marriageRecords.list.invalidate();
      showSuccessMessage('تم إضافة رسم الزواج بنجاح');
    },
    onError: (error) => showErrorMessage('تعذر إضافة رسم الزواج', error),
  });
  const update = trpc.marriageRecords.update.useMutation({
    onSuccess: () => {
      utils.marriageRecords.list.invalidate();
      showSuccessMessage('تم تحديث رسم الزواج بنجاح');
    },
    onError: (error) => showErrorMessage('تعذر تحديث رسم الزواج', error),
  });
  const remove = trpc.marriageRecords.delete.useMutation({
    onSuccess: () => utils.marriageRecords.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Vision-based auto-fill
  const processVision = trpc.ocr.processMarriageDocuments.useMutation();
  const { data: visionStatus } = trpc.ocr.checkVisionAvailability.useQuery();
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const fillPdfMutation = trpc.pdf.fillMarriageCertificate.useMutation();
  const authTemplateMutation = trpc.pdf.generateAuthorizationTemplate.useMutation();

  const { register, handleSubmit, reset, setValue, watch, control } = useForm<MarriageRecord>({
    resolver: zodResolver(marriageRecordSchema),
    defaultValues: defaultMarriageValues as Partial<MarriageRecord>,
  });
  const [existingDocuments, setExistingDocuments] = useState<MarriageDocument[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingMarriageDocument[]>([]);
  const documentsInputRef = useRef<HTMLInputElement | null>(null);
  const pendingDocumentsStore = useRef<PendingMarriageDocument[]>([]);
  
  // Template/PDF editor state
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [showPdfEditor, setShowPdfEditor] = useState(false);
  const [pdfEditorMode, setPdfEditorMode] = useState<PdfEditorMode>('template');
  const [previewPaneMode, setPreviewPaneMode] = useState<PreviewPaneMode>('interactive');
  const [templateFields, setTemplateFields] = useState({
    file_number: '',
    file_year: new Date().getFullYear().toString(),
    court_appeal: 'محكمة الاستئناف بطنجة',
    court_first_instance: 'المحكمة الابتدائية بطنجة',
    court_family_section: 'قسم قضاء الأسرة',
    court_city: 'طنجة',
    // Time and date details
    meeting_time: 'الثالثة مساءً',
    meeting_day: 'الأربعاء',
    hijri_day: 'سابع وعشرون',
    hijri_month: 'قعدة',
    hijri_year: 'ألف وأربعمائة وتسعة وعشرين',
    gregorian_day: 'سادس وعشرون',
    gregorian_month: 'نونبر',
    gregorian_year: 'ألفين وثمانية',
    // Witnesses
    witness1_name: 'زكرياء العياش',
    witness2_name: 'أحمد البخاري التندالي',
  });
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewMeta, setPdfPreviewMeta] = useState<{ filename: string } | null>(null);
  const [customFields, setCustomFields] = useState<{key: string; label: string; value: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'record' | 'fields' | 'suggestions'>('settings');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const totalInteractivePages = DEFAULT_INTERACTIVE_DOCUMENT_PAGES.length;
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const [interactiveDocumentPages, setInteractiveDocumentPages] = useState<string[]>([]);
  const [interactiveDocTouched, setInteractiveDocTouched] = useState<boolean[]>(
    () => new Array(totalInteractivePages).fill(false),
  );
  const [activeInteractivePage, setActiveInteractivePage] = useState(0);
  const downloadAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const watchedRecord = watch();

  const placeholderValues = useMemo(() => {
    const resolvedFileNumber =
      templateFields.file_number?.trim() ||
      (watchedRecord.registry_number != null ? String(watchedRecord.registry_number) : '');
    return {
      ...watchedRecord,
      ...templateFields,
      file_number: resolvedFileNumber,
      file_year: templateFields.file_year,
      request_date_gregorian: watchedRecord.inclusion_date,
      request_date_hijri: watchedRecord.inclusion_hijri,
      morocco_logo: '/logos/morocco-coat.jpg',
      adoul_logo: '/logos/adoul-logo.jpg',
    };
  }, [templateFields, watchedRecord]);

  const defaultInteractivePageHtmls = useMemo(
    () => DEFAULT_INTERACTIVE_DOCUMENT_PAGES.map((template) => renderInteractiveTemplate(template, placeholderValues)),
    [placeholderValues],
  );

  useEffect(() => {
    setInteractiveDocumentPages((prev) => {
      if (prev.length === 0) {
        return defaultInteractivePageHtmls;
      }
      return prev.map((page, index) =>
        interactiveDocTouched[index] ? page : defaultInteractivePageHtmls[index] || page,
      );
    });
  }, [defaultInteractivePageHtmls, interactiveDocTouched]);

  const handleInteractiveHtmlChange = useCallback((pageIndex: number, next: string) => {
    setInteractiveDocumentPages((prev) => prev.map((page, idx) => (idx === pageIndex ? next : page)));
    setInteractiveDocTouched((prev) => prev.map((flag, idx) => (idx === pageIndex ? true : flag)));
  }, []);

  const handleSyncInteractiveHtml = useCallback(
    (pageIndex: number) => {
      setInteractiveDocumentPages((prev) =>
        prev.map((page, idx) => (idx === pageIndex ? defaultInteractivePageHtmls[idx] : page)),
      );
      setInteractiveDocTouched((prev) => prev.map((flag, idx) => (idx === pageIndex ? false : flag)));
    },
    [defaultInteractivePageHtmls],
  );

  const downloadCurrentPreview = useCallback(
    (url: string, explicitName?: string) => {
      const fallbackName =
        pdfEditorMode === 'filled'
          ? `marriage-filled-${Date.now()}.pdf`
          : `marriage-template-${templateFields.file_number || Date.now()}.pdf`;
      const fileName = explicitName || pdfPreviewMeta?.filename || fallbackName;

      // Create a temporary anchor element for download
      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.download = fileName;
      tempLink.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(tempLink);
      tempLink.click();
      
      // Clean up - use setTimeout to ensure download has started
      setTimeout(() => {
        document.body.removeChild(tempLink);
      }, 100);

      showSuccessMessage('✓ تم تنزيل نسخة المعاينة بنجاح');
    },
    [pdfEditorMode, pdfPreviewMeta, showSuccessMessage, templateFields.file_number],
  );

  useEffect(() => {
    if (pdfEditorMode !== 'filled') {
      setPreviewPaneMode('pdf');
    }
  }, [pdfEditorMode]);

  useEffect(() => {
    if (showPdfEditor && pdfEditorMode === 'filled') {
      setPreviewPaneMode('interactive');
    }
  }, [pdfEditorMode, showPdfEditor]);

  const buildPdfPayload = useCallback(
    (formData: MarriageRecord) => {
      const safeNumber = (value?: number | null) =>
        typeof value === 'number' && !Number.isNaN(value) ? value : undefined;

      const resolvedFileNumber =
        templateFields.file_number?.trim()
          ? templateFields.file_number.trim()
          : formData.registry_number != null
            ? formData.registry_number.toString()
            : undefined;

      return {
        file_number: resolvedFileNumber,
        file_year: templateFields.file_year,
        court_city: templateFields.court_city,
        court_appeal: templateFields.court_appeal,
        court_first_instance: templateFields.court_first_instance,
        court_family_section: templateFields.court_family_section,
        request_date_gregorian: formData.inclusion_date,
        request_date_hijri: formData.inclusion_hijri,
        inclusion_date: formData.inclusion_date,
        inclusion_hijri: formData.inclusion_hijri,
        meeting_time: templateFields.meeting_time,
        meeting_day: templateFields.meeting_day,
        hijri_day: templateFields.hijri_day,
        hijri_month: templateFields.hijri_month,
        hijri_year: templateFields.hijri_year,
        gregorian_day: templateFields.gregorian_day,
        gregorian_month: templateFields.gregorian_month,
        gregorian_year: templateFields.gregorian_year,
        witness1_name: templateFields.witness1_name,
        witness2_name: templateFields.witness2_name,
        registry_book_type: formData.registry_book_type,
        registry_number: safeNumber(formData.registry_number),
        registry_page: safeNumber(formData.registry_page),
        registry_count: safeNumber(formData.registry_count),
        registry_letter: formData.registry_letter,
        husband_name: formData.husband_name,
        husband_cin: formData.husband_cin,
        husband_birth_date: formData.husband_birth_date,
        husband_birth_place: formData.husband_birth_place,
        husband_birth_cert_num: formData.husband_birth_cert_num,
        husband_birth_year: formData.husband_birth_year,
        husband_nationality: formData.husband_nationality,
        husband_marital_status: formData.husband_marital_status,
        husband_residence: formData.husband_residence,
        husband_occupation: formData.husband_occupation,
        wife_name: formData.wife_name,
        wife_cin: formData.wife_cin,
        wife_birth_date: formData.wife_birth_date,
        wife_birth_place: formData.wife_birth_place,
        wife_birth_cert_num: formData.wife_birth_cert_num,
        wife_birth_year: formData.wife_birth_year,
        wife_nationality: formData.wife_nationality,
        wife_marital_status: formData.wife_marital_status,
        wife_residence: formData.wife_residence,
        wife_occupation: formData.wife_occupation,
        wife_father_name: formData.wife_father_name,
        wife_father_birth_date: formData.wife_father_birth_date,
        wife_father_cin: formData.wife_father_cin,
        marriage_authorization_no: formData.marriage_authorization_no,
        engagement_cert_num: formData.engagement_cert_num,
        engagement_cert_date: formData.engagement_cert_date,
        dowry_amount: safeNumber(formData.dowry_amount),
        contracted_by: formData.contracted_by,
        interactive_document_pages: interactiveDocumentPages,
      };
    },
    [interactiveDocumentPages, templateFields],
  );

  // Auto-fill using vision model
  const handleVisionAutoFill = useCallback(async () => {
    if (pendingDocuments.length === 0) {
      showErrorMessage('الرجاء تحميل المستندات أولاً');
      return;
    }

    setIsProcessingVision(true);
    try {
      const docs = pendingDocuments.map((doc) => ({
        base64: doc.base64,
        subject: doc.subject,
        filename: doc.name,
      }));

      const result = await processVision.mutateAsync({ documents: docs });

      if (result.extractedData) {
        Object.entries(result.extractedData).forEach(([key, value]) => {
          if (value) {
            setValue(key as keyof MarriageRecord, value as never);
          }
        });

        const fieldCount = Object.keys(result.extractedData).length;
        showSuccessMessage(`✓ تم استخراج ${fieldCount} حقل من المستندات باستخدام LLaVA Vision`);
      } else {
        showErrorMessage('⚠ لم يتم استخراج بيانات واضحة - يرجى المراجعة اليدوية');
      }
    } catch (error) {
      showErrorMessage('خطأ في معالجة المستندات', error);
    } finally {
      setIsProcessingVision(false);
    }
  }, [pendingDocuments, processVision, setValue]);

  const resetPreviewState = useCallback(() => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfPreviewMeta(null);
  }, [pdfPreviewUrl]);

  const openPdfEditor = useCallback((mode: PdfEditorMode) => {
    const formData = watch();
    setTemplateFields(prev => ({
      ...prev,
      file_number: formData.registry_number?.toString() || prev.file_number || '',
    }));
    setPdfEditorMode(mode);
    setActiveTab(mode === 'filled' ? 'record' : 'settings');
    resetPreviewState();
    setShowPdfEditor(true);
  }, [resetPreviewState, setTemplateFields, watch]);

  const handleOpenFilledPdfEditor = useCallback(() => {
    openPdfEditor('filled');
  }, [openPdfEditor]);

  const handleCreateTemplate = useCallback(() => {
    openPdfEditor('template');
  }, [openPdfEditor]);

  const handleRecordFieldInput = useCallback(
    (name: keyof MarriageRecord, rawValue: string, inputType: 'text' | 'date' | 'number' = 'text') => {
      if (inputType === 'number') {
        const numericValue = rawValue === '' ? undefined : Number(rawValue);
        setValue(name, (Number.isNaN(numericValue as number) ? undefined : (numericValue as any)));
        return;
      }
      setValue(name, (rawValue as any));
    },
    [setValue],
  );

  const handleGeneratePreview = useCallback(async () => {
    const formData = watch();
    try {
      setIsPreviewLoading(true);
      const payload = buildPdfPayload(formData);
      const result =
        pdfEditorMode === 'filled'
          ? await fillPdfMutation.mutateAsync(payload)
          : await authTemplateMutation.mutateAsync(payload);

      // Decode base64 PDF properly
      let url: string;
      try {
        const binaryString = atob(result.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        
        // Revoke old URL to prevent memory leaks
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
        }
        
        setPdfPreviewUrl(url);
        setPdfPreviewMeta({ filename: result.filename });
      } catch (decodeError) {
        console.error('PDF Decode Error:', decodeError);
        showErrorMessage('خطأ في فك تشفير ملف PDF');
        throw decodeError;
      }

      showSuccessMessage(
        pdfEditorMode === 'filled'
          ? '✓ تم تحديث معاينة ملف الزواج'
          : '✓ تم تحديث معاينة نموذج الإذن',
      );

      if (pendingDownload) {
        setPendingDownload(false);
        downloadCurrentPreview(url, result.filename);
      }
    } catch (error: any) {
      console.error('Preview Error:', error);
      setPendingDownload(false);
      showErrorMessage('خطأ في إنشاء المعاينة', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    watch,
    buildPdfPayload,
    pdfEditorMode,
    fillPdfMutation,
    authTemplateMutation,
    pdfPreviewUrl,
    showSuccessMessage,
    downloadCurrentPreview,
    pendingDownload,
    showErrorMessage,
  ]);

  const handleDownloadPreview = useCallback(() => {
    if (!pdfPreviewUrl) {
      setPendingDownload(true);
      showInfoMessage('سيتم إنشاء المعاينة أولاً ثم بدء التنزيل تلقائياً');
      handleGeneratePreview();
      return;
    }
    downloadCurrentPreview(pdfPreviewUrl);
  }, [downloadCurrentPreview, handleGeneratePreview, pdfPreviewUrl, showInfoMessage]);

  const handleClosePdfEditor = useCallback(() => {
    setShowPdfEditor(false);
    resetPreviewState();
    setInteractiveDocumentPages([]);
    setInteractiveDocTouched(new Array(totalInteractivePages).fill(false));
    setActiveInteractivePage(0);
  }, [resetPreviewState, totalInteractivePages]);

  const handleAddCustomField = useCallback(() => {
    setCustomFields(prev => [...prev, { key: '', label: '', value: '' }]);
  }, []);

  const handleRemoveCustomField = useCallback((index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateCustomField = useCallback((index: number, field: 'key' | 'label' | 'value', value: string) => {
    setCustomFields(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const handleGenerateAISuggestions = useCallback(() => {
    setIsGeneratingSuggestions(true);
    const formData = watch();
    
    // Simulate AI suggestions based on form data
    setTimeout(() => {
      const suggestions = [
        `رقم الملف المقترح: ${formData.registry_number || 'غير محدد'}/${new Date().getFullYear()}`,
        `اسم الزوج الكامل: ${formData.husband_name || 'غير محدد'}`,
        `اسم الزوجة الكامل: ${formData.wife_name || 'غير محدد'}`,
        `المدينة المقترحة: ${formData.husband_residence || formData.wife_residence || 'طنجة'}`,
        `تاريخ التسجيل: ${formData.inclusion_date || new Date().toLocaleDateString('ar-MA')}`,
      ];
      setAiSuggestions(suggestions);
      setIsGeneratingSuggestions(false);
    }, 1000);
  }, [watch]);

  const handleApplySuggestion = useCallback((suggestion: string) => {
    // Parse and apply suggestion to template fields
    if (suggestion.includes('رقم الملف')) {
      const match = suggestion.match(/: (.+)$/);
      if (match) setTemplateFields(prev => ({ ...prev, file_number: match[1] }));
    }
    showSuccessMessage('✓ تم تطبيق الاقتراح');
  }, []);

  const clearPendingDocuments = useCallback(() => {
    setPendingDocuments((docs) => {
      docs.forEach((doc) => URL.revokeObjectURL(doc.objectUrl));
      return [];
    });
    if (documentsInputRef.current) {
      documentsInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    pendingDocumentsStore.current = pendingDocuments;
  }, [pendingDocuments]);

  useEffect(() => {
    return () => {
      pendingDocumentsStore.current.forEach((doc) => URL.revokeObjectURL(doc.objectUrl));
    };
  }, []);

  const handleDocumentSelection = useCallback(() => {
    documentsInputRef.current?.click();
  }, []);

  const handleDocumentsChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      for (const file of files) {
        const base64 = await readFileAsBase64(file);
        const objectUrl = URL.createObjectURL(file);
        const currentSubjects = new Set(pendingDocumentsStore.current.map((doc) => doc.subject));
        let defaultSubject: MarriageDocumentSubject = 'other';
        if (!currentSubjects.has('husband')) defaultSubject = 'husband';
        else if (!currentSubjects.has('wife')) defaultSubject = 'wife';
        const id = generateDocumentId();
        setPendingDocuments((docs) => [
          ...docs,
          {
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            base64,
            objectUrl,
            subject: defaultSubject,
            ocrStatus: 'idle',
          },
        ]);
      }
      event.target.value = '';
    },
    [],
  );

  const handleRemovePendingDocument = useCallback((docId: string) => {
    setPendingDocuments((docs) => {
      const target = docs.find((doc) => doc.id === docId);
      if (target) {
        URL.revokeObjectURL(target.objectUrl);
      }
      return docs.filter((doc) => doc.id !== docId);
    });
  }, []);

  const handleSubjectChange = useCallback((docId: string, subject: MarriageDocumentSubject) => {
    setPendingDocuments((docs) => docs.map((doc) => (doc.id === docId ? { ...doc, subject } : doc)));
  }, []);

  const handlePreviewPendingDocument = useCallback((doc: PendingMarriageDocument) => {
    window.open(doc.objectUrl, '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    if (!id && !watch('inclusion_date')) {
      setValue('inclusion_date', now.gregorian.slice(0, 10));
    }
    if (!id && !watch('inclusion_hijri')) {
      setValue('inclusion_hijri', now.hijri);
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    const payload = {
      ...values,
      uploaded_files: pendingDocuments.length
        ? pendingDocuments.map((d) => ({ name: d.name, base64: d.base64, type: d.type, size: d.size, subject: d.subject, ocr_raw_text: d.ocrResult?.rawText, ocr_detected_fields: d.ocrResult?.detectedFields }))
        : undefined,
    };
    if (values.id) {
      update.mutate(payload);
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset(defaultMarriageValues);
          clearPendingDocuments();
          setExistingDocuments([]);
        },
      });
    }
  });

  const currentId = watch('id');
  const recordType = watch('record_type');
  const marriageInclusionDate = watch('inclusion_date');
  const marriageInclusionHijri = watch('inclusion_hijri');
  useEffect(() => {
    if (!marriageInclusionDate) {
      if (marriageInclusionHijri) {
        setValue('inclusion_hijri', '');
      }
      return;
    }
    const hijri = convertToHijri(marriageInclusionDate);
    if (hijri && hijri !== marriageInclusionHijri) {
      setValue('inclusion_hijri', hijri);
    }
  }, [marriageInclusionDate, marriageInclusionHijri, setValue]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cin = cinSearch.trim();
    const type = typeSearch.trim();
    setFilters({
      cin: cin || undefined,
      type: type || undefined,
    });
  };

  const clearSearch = () => {
    setCinSearch('');
    setTypeSearch('');
    setFilters(undefined);
  };

  const handlePrint = () => window.print();

  const handleResetForm = () => {
    reset(defaultMarriageValues);
    clearPendingDocuments();
    setExistingDocuments([]);
  };

  const handleEditRecord = (record: MarriageRecord) => {
    reset(record as MarriageRecord);
    if (record.document_url && record.document_name) {
      setExistingDocuments([{ name: record.document_name, url: record.document_url, isObjectUrl: false }]);
      setValue('document_url', record.document_url || '');
      setValue('document_name', record.document_name || '');
    } else {
      setExistingDocuments([]);
      setValue('document_url', '');
      setValue('document_name', '');
    }
  };
  type TableColumn = {
    label: string;
    key?: keyof MarriageRecord;
    className?: string;
    render?: (row: MarriageRecord, index: number) => React.ReactNode;
  };

  const compactColumns: TableColumn[] = [
    { label: '#', render: (_row, index) => index + 1, className: 'text-center w-10' },
    { label: 'نوع السجل', render: (row) => marriageTypeLabel[row.record_type ?? 'adult'] },
    { label: 'تاريخ التضمين', key: 'inclusion_date' },
    { label: 'التاريخ (هجري)', key: 'inclusion_hijri' },
    { label: 'أسماء الخاطبين', render: (row) => `${row.husband_name ?? '—'} / ${row.wife_name ?? '—'}` },
    { label: 'رقم البطاقة', render: (row) => `${row.husband_cin ?? '—'} / ${row.wife_cin ?? '—'}` },
  ];

  const expandedColumns: TableColumn[] = [
    ...compactColumns,
    { label: 'نوع الرسم', key: 'fee_type' },
    { label: 'اسم الزوج', key: 'husband_name' },
    { label: 'اسم الزوجة', key: 'wife_name' },
    { label: 'رقم بطاقة الزوج', key: 'husband_cin' },
    { label: 'رقم بطاقة الزوجة', key: 'wife_cin' },
    {
      label: 'الحالة الاجتماعية',
      render: (row) => `${row.husband_marital_status ?? '—'} / ${row.wife_marital_status ?? '—'}`,
    },
    {
      label: 'ملفات الأذون/الجواز',
      render: (row) =>
        [
          row.minor_husband_permit_file_no,
          row.minor_wife_permit_file_no,
          row.mixed_marriage_husband_passport_no,
          row.mixed_marriage_wife_passport_no,
        ]
          .filter((value) => value != null && value !== '')
          .join(' / ') || '—',
    },
    {
      label: 'ضمن كناش الزواج',
      render: (row) =>
        [row.registry_book_type, row.registry_number, row.registry_count, row.registry_letter, row.registry_page]
          .filter((value) => value != null && value !== '')
          .join(' / ') || '—',
    },
    {
      label: 'المراجع / الملاحظات',
      render: (row) => (
        <div className="space-y-1">
          <div>{row.source_document_ref || '—'}</div>
          {row.notes && <div className="text-slate-500">{row.notes}</div>}
          {row.document_url && (
            <button className="btn-secondary text-xs" type="button" onClick={() => window.open(row.document_url as string, '_blank', 'noopener,noreferrer')}>
              فتح الوثيقة
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderMarriageTable = (columns: TableColumn[]) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
      <table className="min-w-full text-xs md:text-sm rtl:text-right">
        <thead className="bg-slate-200 text-slate-900">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={`p-2 ${column.className ?? ''}`}>
                {column.label}
              </th>
            ))}
            <th className="p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {list?.map((row, index) => (
            <tr key={row.id ?? index} className="border-t border-slate-300">
              {columns.map((column) => (
                <td key={column.label} className={`p-2 ${column.className ?? ''}`}>
                  {column.render ? column.render(row as MarriageRecord, index) : (row as MarriageRecord)[column.key ?? '']}
                </td>
              ))}
              <td className="p-2">
                <div className="flex gap-2">
                  <button className="btn-secondary" type="button" onClick={() => handleEditRecord(row as MarriageRecord)}>
                    تعديل
                  </button>
                  <button className="btn-danger" type="button" onClick={() => row.id && remove.mutate({ id: row.id })}>
                    مسح
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!list?.length && (
            <tr>
              <td className="p-4 text-center text-slate-500" colSpan={columns.length + 1}>
                لا توجد سجلات متاحة حالياً.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold text-slate-900">رسوم الزواج</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="رقم البطاقة الوطنية"
            value={cinSearch}
            onChange={(event) => setCinSearch(event.target.value)}
          />
          <select className="input" value={typeSearch} onChange={(event) => setTypeSearch(event.target.value)}>
            <option value="">نوع السجل</option>
            {Object.entries(marriageTypeLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button className="btn-primary flex-1" type="submit">
              بحث
            </button>
            <button className="btn-secondary flex-1" type="button" onClick={clearSearch}>
              مسح
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          يمكن البحث برقم بطاقة أحد الخاطبين أو اختيار نوع السجل لمراجعة تسجيلات معينة.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1.35fr]">
        <section className="space-y-3 banana-card relative">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-slate-900">جدول الرسوم</h4>
            <button className="btn-secondary text-xs" type="button" onClick={() => setIsTableFullscreen(true)}>
              تكبير
            </button>
          </div>
          {renderMarriageTable(compactColumns)}
        </section>

        <section className="space-y-3 banana-card">
          <h4 className="text-base font-semibold text-slate-900">بيانات رسم الزواج</h4>

          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select className="input" {...register('record_type')}>
                {Object.entries(marriageTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select className="input" {...register('fee_type')}>
                {marriageFeeTypes.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" type="date" {...register('inclusion_date')} />
              <input className="input" placeholder="التاريخ (هجري)" {...register('inclusion_hijri')} />
            </div>

            {pendingDocuments.length > 0 && visionStatus?.available && (
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
                <button
                  className="btn-primary w-full text-base flex items-center justify-center gap-2"
                  type="button"
                  onClick={handleVisionAutoFill}
                  disabled={isProcessingVision}
                >
                  {isProcessingVision ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      🤖 ملء تلقائي من المستندات
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-slate-600 mt-2">
                  سيتم استخراج البيانات تلقائياً من الوثائق المرفوعة
                </p>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">بيانات الخاطب</div>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className="input" placeholder="اسم الخاطب" {...register('husband_name')} />
                <input className="input" placeholder="رقم البطاقة" {...register('husband_cin')} />
                <input className="input" type="date" {...register('husband_birth_date')} />
                <input className="input" placeholder="الجنسية" {...register('husband_nationality')} />
                <input className="input" placeholder="محل السكنى أو الإقامة" {...register('husband_residence')} />
                <input className="input" placeholder="الحالة العائلية" {...register('husband_marital_status')} />
                <input className="input" placeholder="المهنة" {...register('husband_occupation')} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-red-900" {...register('husband_is_muslim')} />
                  مسلم
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-red-900" {...register('is_minor_husband')} />
                  قاصر
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">بيانات المخطوبة</div>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className="input" placeholder="اسم المخطوبة" {...register('wife_name')} />
                <input className="input" placeholder="رقم البطاقة" {...register('wife_cin')} />
                <input className="input" type="date" {...register('wife_birth_date')} />
                <input className="input" placeholder="الجنسية" {...register('wife_nationality')} />
                <input className="input" placeholder="محل السكنى أو الإقامة" {...register('wife_residence')} />
                <input className="input" placeholder="الحالة العائلية" {...register('wife_marital_status')} />
                <input className="input" placeholder="المهنة" {...register('wife_occupation')} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-red-900" {...register('wife_is_muslim')} />
                  مسلمة
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-red-900" {...register('is_minor_wife')} />
                  قاصرة
                </label>
              </div>
            </div>

            {recordType === 'minor' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  className="input"
                  placeholder="رقم ملف إذن الخاطب"
                  {...register('minor_husband_permit_file_no')}
                />
                <input
                  className="input"
                  placeholder="رقم ملف إذن المخطوبة"
                  {...register('minor_wife_permit_file_no')}
                />
              </div>
            )}

            {recordType === 'mixed' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  className="input"
                  placeholder="رقم جواز الخاطب"
                  {...register('mixed_marriage_husband_passport_no')}
                />
                <input
                  className="input"
                  placeholder="رقم جواز المخطوبة"
                  {...register('mixed_marriage_wife_passport_no')}
                />
              </div>
            )}

            {recordType === 'disabled' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  className="input"
                  placeholder="نوع إعاقة الخاطب"
                  {...register('husband_disability_type')}
                />
                <input
                  className="input"
                  placeholder="نوع إعاقة المخطوبة"
                  {...register('wife_disability_type')}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="input" placeholder="رقم إذن التزوج" {...register('marriage_authorization_no')} />
              <input
                className="input"
                type="number"
                placeholder="مبلغ الصداق"
                {...register('dowry_amount', { valueAsNumber: true })}
              />
              <Controller
                control={control}
                name="investment_of_assets_agreed"
                defaultValue={undefined}
                render={({ field }) => (
                  <div className="flex flex-col gap-2 text-sm text-slate-700 md:mt-0">
                    <span className="font-semibold text-slate-900">هل تم الاتفاق على استثمار الأموال؟</span>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.name}
                          checked={field.value === true}
                          onChange={() => field.onChange(true)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                        نعم
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.name}
                          checked={field.value === false}
                          onChange={() => field.onChange(false)}
                          onBlur={field.onBlur}
                        />
                        لا
                      </label>
                    </div>
                  </div>
                )}
              />
            </div>

            <textarea className="input" rows={2} placeholder="المحرر" {...register('contracted_by')} />
            <textarea className="input" rows={2} placeholder="ملاحظات" {...register('notes')} />

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">ضمن كناش الزواج</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                <input className="input" placeholder="حرف / صفحة" {...register('registry_letter')} />
              </div>
              <input
                className="input"
                type="number"
                placeholder="رقم الصفحة"
                {...register('registry_page', { valueAsNumber: true })}
              />
            </div>

            <textarea
              className="input"
              rows={2}
              placeholder="مراجع مستند الرسم"
              {...register('source_document_ref')}
            />

            {(existingDocuments.length > 0 || pendingDocuments.length > 0) && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {visionStatus && (
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="font-medium">حالة الذكاء الاصطناعي:</span>
                    {visionStatus.available ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
                        ✓ متاح ({visionStatus.model})
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-800">
                        ⚠ غير متاح
                      </span>
                    )}
                  </div>
                )}

                {existingDocuments.length > 0 && (
                  <div className="mb-2">
                    <div className="font-semibold">مستندات محفوظة:</div>
                    {existingDocuments.map((d, idx) => (
                      <div key={`ex-${idx}`} className="mt-1 flex items-center justify-between">
                        <div>{d.name}</div>
                        <div className="flex gap-2">
                          <button className="btn-secondary text-xs" type="button" onClick={() => window.open(d.url, '_blank', 'noopener,noreferrer')}>
                            فتح
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingDocuments.length > 0 && (
                  <div>
                    <div className="font-semibold">ملفات محلية مختارة:</div>
                    <ul className="mt-1 space-y-2">
                      {pendingDocuments.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{doc.name}</div>
                            <div className="text-xs text-slate-500">
                              {doc.subject === 'husband' ? 'وثيقة الزوج' : doc.subject === 'wife' ? 'وثيقة الزوجة' : 'وثيقة أخرى'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <select
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                              value={doc.subject}
                              onChange={(e) => handleSubjectChange(doc.id, e.target.value as MarriageDocumentSubject)}
                            >
                              {marriageDocumentSubjectOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button className="btn-secondary text-xs" type="button" onClick={() => handlePreviewPendingDocument(doc)}>
                              معاينة
                            </button>
                            <button className="btn-danger text-xs" type="button" onClick={() => handleRemovePendingDocument(doc.id)}>
                              إزالة
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="btn-secondary text-sm"
                        type="button"
                        onClick={() => documentsInputRef.current?.click()}
                      >
                        إضافة مستندات
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <input
              ref={documentsInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleDocumentsChange}
              multiple
            />
            <input type="hidden" {...register('document_url')} />
            <input type="hidden" {...register('document_name')} />

            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={handleDocumentSelection}>
                جلب الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleOpenFilledPdfEditor}>
                📄 إنشاء PDF معبأ
              </button>
              <button className="btn-secondary" type="button" onClick={handleCreateTemplate}>
                📋 إنشاء النموذج
              </button>
              <button className="btn-secondary" type="button" onClick={handlePrint}>
                نظير الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleResetForm}>
                جديد
              </button>
              {currentId && (
                <button className="btn-danger" type="button" onClick={() => currentId && remove.mutate({ id: currentId })}>
                  مسح
                </button>
              )}
              <button className="btn-primary" type="submit">
                {currentId ? 'تعديل' : 'إضافة'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {isTableFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur">
          <div className="flex h-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">جدول الرسوم</h4>
              <button className="btn-secondary text-xs" type="button" onClick={() => setIsTableFullscreen(false)}>
                إغلاق
              </button>
            </div>
            <div className="flex-1 overflow-auto">{renderMarriageTable(expandedColumns)}</div>
          </div>
        </div>
      )}

      {showPdfEditor && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            <a ref={downloadAnchorRef} className="hidden" />
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {pdfEditorMode === 'filled' ? '🧾 منشئ PDF المعبأ التفاعلي' : '📋 محرر النموذج التفاعلي المتقدم'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {pdfEditorMode === 'filled'
                    ? 'راجع وعدّل بيانات الوثيقة وشاهد المعاينة فوراً قبل التنزيل'
                    : 'تحكم كامل في الحقول والبيانات مع اقتراحات ذكية'}
                </p>
              </div>
              <button className="btn-danger" type="button" onClick={handleClosePdfEditor}>
                ✕ إغلاق
              </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
              {/* Enhanced Settings Panel with Tabs */}
              <div className="w-[450px] flex-shrink-0 flex flex-col overflow-hidden rounded-lg bg-slate-50">
                {/* Tab Navigation */}
                <div className="flex border-b bg-white">
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveTab('settings')}
                  >
                    ⚙️ الإعدادات الأساسية
                  </button>
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'record'
                        ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveTab('record')}
                  >
                    🧾 بيانات الرسوم
                  </button>
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'fields'
                        ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveTab('fields')}
                  >
                    📝 الحقول المخصصة
                  </button>
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'suggestions'
                        ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveTab('suggestions')}
                  >
                    🤖 اقتراحات ذكية
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === 'settings' && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">⚙️ إعدادات النموذج</h4>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">رقم الملف</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.file_number}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, file_number: e.target.value }))}
                      placeholder="أدخل رقم الملف"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">السنة</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.file_year}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, file_year: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">محكمة الاستئناف</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.court_appeal}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, court_appeal: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">المحكمة الابتدائية</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.court_first_instance}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, court_first_instance: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">القسم</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.court_family_section}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, court_family_section: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">المدينة</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.court_city}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, court_city: e.target.value }))}
                    />
                  </div>

                  <hr className="my-4 border-slate-300" />
                  <h5 className="text-md font-semibold text-slate-700 mb-3">⏰ التاريخ والوقت</h5>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">الساعة</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.meeting_time}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, meeting_time: e.target.value }))}
                        placeholder="الثالثة مساءً"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">يوم الأسبوع</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.meeting_day}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, meeting_day: e.target.value }))}
                        placeholder="الأربعاء"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">اليوم الهجري</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.hijri_day}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, hijri_day: e.target.value }))}
                        placeholder="سابع وعشرون"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">الشهر الهجري</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.hijri_month}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, hijri_month: e.target.value }))}
                        placeholder="قعدة"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">السنة الهجرية</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.hijri_year}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, hijri_year: e.target.value }))}
                        placeholder="1429"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">اليوم الميلادي</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.gregorian_day}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, gregorian_day: e.target.value }))}
                        placeholder="سادس وعشرون"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">الشهر الميلادي</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.gregorian_month}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, gregorian_month: e.target.value }))}
                        placeholder="نونبر"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">السنة الميلادية</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={templateFields.gregorian_year}
                        onChange={(e) => setTemplateFields(prev => ({ ...prev, gregorian_year: e.target.value }))}
                        placeholder="2008"
                      />
                    </div>
                  </div>

                  <hr className="my-4 border-slate-300" />
                  <h5 className="text-md font-semibold text-slate-700 mb-3">👥 العدول</h5>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">اسم العدل الأول</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.witness1_name}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, witness1_name: e.target.value }))}
                      placeholder="زكرياء العياش"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">اسم العدل الثاني</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={templateFields.witness2_name}
                      onChange={(e) => setTemplateFields(prev => ({ ...prev, witness2_name: e.target.value }))}
                      placeholder="أحمد البخاري التندالي"
                    />
                  </div>

                      <div className="flex gap-2 pt-4">
                        <button 
                          className="btn-primary flex-1"
                          type="button" 
                          onClick={handleGeneratePreview}
                        >
                          🔄 تحديث المعاينة
                        </button>
                      </div>

                      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">💡 نصيحة:</p>
                        <p>يمكنك تعديل جميع الحقول ثم الضغط على "تحديث المعاينة" لرؤية التغييرات فوراً</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'record' && (
                    <div className="space-y-5">
                      {pdfRecordFieldGroups.map((group) => (
                        <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                          <h4 className="text-base font-semibold text-slate-700 mb-3">{group.title}</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {group.fields.map((field) => {
                              const rawValue = watch(field.name as any) as unknown;
                              const inputType =
                                field.inputType === 'date'
                                  ? 'date'
                                  : field.inputType === 'number'
                                    ? 'number'
                                    : 'text';
                              const value =
                                field.inputType === 'number'
                                  ? rawValue !== undefined && rawValue !== null
                                    ? String(rawValue)
                                    : ''
                                  : (rawValue as string) ?? '';
                              return (
                                <div key={String(field.name)}>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
                                  <input
                                    type={inputType}
                                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) =>
                                      handleRecordFieldInput(field.name, e.target.value, field.inputType)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'fields' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">📝 الحقول المخصصة</h4>
                        <button
                          className="btn-success text-sm"
                          type="button"
                          onClick={handleAddCustomField}
                        >
                          ➕ إضافة حقل
                        </button>
                      </div>

                      {customFields.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <div className="text-4xl mb-2">📋</div>
                          <p className="text-slate-600 font-medium">لا توجد حقول مخصصة</p>
                          <p className="text-sm text-slate-500 mt-1">اضغط على "إضافة حقل" لبدء إضافة حقول مخصصة</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customFields.map((field, index) => (
                            <div key={index} className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500">حقل #{index + 1}</span>
                                <button
                                  className="text-red-500 hover:text-red-700 text-sm"
                                  type="button"
                                  onClick={() => handleRemoveCustomField(index)}
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                  placeholder="مفتاح الحقل (مثال: custom_field_1)"
                                  value={field.key}
                                  onChange={(e) => handleUpdateCustomField(index, 'key', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                  placeholder="تسمية الحقل (مثال: رقم إضافي)"
                                  value={field.label}
                                  onChange={(e) => handleUpdateCustomField(index, 'label', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                  placeholder="قيمة الحقل"
                                  value={field.value}
                                  onChange={(e) => handleUpdateCustomField(index, 'value', e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800">
                        <p className="font-semibold mb-1">💡 كيفية الاستخدام:</p>
                        <p>الحقول المخصصة تسمح لك بإضافة بيانات إضافية للنموذج حسب احتياجاتك</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'suggestions' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">🤖 اقتراحات ذكية</h4>
                        <button
                          className="btn-primary text-sm"
                          type="button"
                          onClick={handleGenerateAISuggestions}
                          disabled={isGeneratingSuggestions}
                        >
                          {isGeneratingSuggestions ? '⏳ جاري التحليل...' : '✨ إنشاء اقتراحات'}
                        </button>
                      </div>

                      {aiSuggestions.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <div className="text-4xl mb-2">🤖</div>
                          <p className="text-slate-600 font-medium">لا توجد اقتراحات بعد</p>
                          <p className="text-sm text-slate-500 mt-1">اضغط على "إنشاء اقتراحات" للحصول على توصيات ذكية</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aiSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-blue-200 bg-blue-50 p-3 hover:bg-blue-100 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-slate-700 flex-1">{suggestion}</p>
                                <button
                                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold whitespace-nowrap"
                                  type="button"
                                  onClick={() => handleApplySuggestion(suggestion)}
                                >
                                  ✓ تطبيق
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg bg-purple-50 p-3 text-xs text-purple-800">
                        <p className="font-semibold mb-1">🧠 الاقتراحات الذكية:</p>
                        <p>يتم تحليل البيانات المدخلة وتقديم اقتراحات تلقائية لتحسين دقة النموذج</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t bg-white p-4">
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1"
                      type="button"
                      onClick={handleGeneratePreview}
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? '⏳ جاري التوليد...' : '🔄 تحديث المعاينة'}
                    </button>
                    <button
                      className="btn-success"
                      type="button"
                      onClick={handleDownloadPreview}
                      disabled={isPreviewLoading}
                    >
                      {pdfEditorMode === 'filled' ? '⬇️ تنزيل PDF المعبأ' : '⬇️ تنزيل النموذج'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive preview / PDF pane */}
              <div className="flex flex-1 flex-col overflow-hidden rounded-lg border-2 border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-100 px-4 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {pdfEditorMode === 'filled'
                        ? previewPaneMode === 'interactive'
                          ? 'وضع التحرير المباشر (يمكنك تعديل كل صفحة)'
                          : 'معاينة ملف الزواج (PDF)'
                        : 'معاينة النموذج'}
                    </span>
                    {pdfEditorMode === 'filled' && (
                      <div className="inline-flex items-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600">
                        <button
                          type="button"
                          className={`rounded-full px-3 py-1 transition ${
                            previewPaneMode === 'interactive' ? 'bg-red-950 text-white shadow' : 'hover:bg-slate-100'
                          }`}
                          onClick={() => setPreviewPaneMode('interactive')}
                        >
                          ✏️ التحرير المباشر
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-3 py-1 transition ${
                            previewPaneMode === 'pdf' ? 'bg-red-950 text-white shadow' : 'hover:bg-slate-100'
                          }`}
                          onClick={() => setPreviewPaneMode('pdf')}
                        >
                          👁️ معاينة PDF
                        </button>
                      </div>
                    )}
                    {pdfEditorMode === 'filled' && previewPaneMode === 'interactive' && (
                      <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {DEFAULT_INTERACTIVE_DOCUMENT_PAGES.map((_, pageIndex) => (
                          <button
                            key={pageIndex}
                            type="button"
                            className={`rounded-full px-2 py-0.5 transition ${
                              activeInteractivePage === pageIndex ? 'bg-red-950 text-white shadow' : 'hover:bg-slate-100'
                            }`}
                            onClick={() => setActiveInteractivePage(pageIndex)}
                          >
                            صفحة {pageIndex + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-success text-sm"
                    type="button"
                    onClick={handleDownloadPreview}
                    disabled={isPreviewLoading}
                  >
                    ⬇️ تنزيل PDF
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50">
                  {pdfEditorMode === 'filled' && previewPaneMode === 'interactive' ? (
                    <InteractivePdfEditor
                      value={interactiveDocumentPages[activeInteractivePage] || ''}
                      onChange={(next) => handleInteractiveHtmlChange(activeInteractivePage, next)}
                      onSyncFromData={() => handleSyncInteractiveHtml(activeInteractivePage)}
                    />
                  ) : pdfPreviewUrl ? (
                    <iframe 
                      src={pdfPreviewUrl} 
                      className="h-full w-full border-0" 
                      title="PDF Preview"
                      allow="fullscreen"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mb-4 text-6xl">📄</div>
                        <p className="text-lg font-medium text-slate-600">اضغط على "تحديث المعاينة" لعرض النموذج</p>
                        <p className="mt-2 text-sm text-slate-500">سيتم إنشاء PDF مع البيانات المدخلة</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const divorceTypeOptions = [
  { value: 'shiqaq', label: 'طلاق الشقاق' },
  { value: 'agreement', label: 'الطلاق الاتفاقي' },
  { value: 'khul', label: 'الطلاق الخلعي' },
  { value: 'mamluk', label: 'الطلاق المملك' },
  { value: 'complete_three', label: 'الطلاق المكمل للثلاث' },
  { value: 'bain', label: 'الطلاق البائن' },
];

const divorceFeeOptions: Record<DivorceRecord['divorce_type'], string[]> = {
  bain: ['طلاق بائن بعد الدخول', 'طلاق بائن قبل الدخول'],
  khul: ['طلاق خلعي بعد الدخول', 'طلاق خلعي قبل الدخول'],
  shiqaq: ['طلاق للشقاق بعد الدخول', 'طلاق للشقاق قبل الدخول'],
  agreement: ['طلاق اتفاقي بعد الدخول', 'طلاق اتفاقي قبل الدخول'],
  mamluk: ['طلاق مملك بعد الدخول', 'طلاق مملك قبل الدخول'],
  complete_three: ['طلاق مكمل للثلاث بعد الدخول', 'طلاق مكمل للثلاث قبل الدخول'],
};

const defaultDivorceValues: Partial<DivorceRecord> = {
  divorce_type: 'bain',
  fee_type: 'طلاق بائن بعد الدخول',
};


function DivorceSection() {
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState<{ cin?: string; divorce_type?: string }>();
  const [cinSearch, setCinSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const { data: list } = trpc.divorceRecords.list.useQuery(filters);
  const create = trpc.divorceRecords.create.useMutation({
    onSuccess: () => {
      utils.divorceRecords.list.invalidate();
      showSuccessMessage('تم إضافة رسم الطلاق بنجاح');
    },
    onError: (error) => showErrorMessage('تعذر إضافة رسم الطلاق', error),
  });
  const update = trpc.divorceRecords.update.useMutation({
    onSuccess: () => utils.divorceRecords.list.invalidate(),
  });
  const remove = trpc.divorceRecords.delete.useMutation({
    onSuccess: () => utils.divorceRecords.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<DivorceRecord>({
    resolver: zodResolver(divorceRecordSchema),
    defaultValues: defaultDivorceValues as Partial<DivorceRecord>,
  });
  const {
    localDocument,
    pendingUpload,
    fileInputRef,
    handleFetch,
    handleFileChange,
    resetLocalDocument,
    openLocalDocument,
    setRemoteDocument,
  } = useLocalDocumentField(setValue, 'source_document_ref', {
    documentUrlField: 'document_url',
    documentNameField: 'document_name',
  });

  const divorceRegistryBookType = watch('divorce_registry_book_type');

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    if (!id && !watch('inclusion_date')) {
      setValue('inclusion_date', now.gregorian.slice(0, 10));
    }
    if (!id && !watch('inclusion_hijri')) {
      setValue('inclusion_hijri', now.hijri);
    }
  }, [now, setValue, watch]);

  useEffect(() => {
    if (!divorceRegistryBookType) {
      setValue('divorce_registry_book_type', 'سجل الطلاق');
    }
  }, [divorceRegistryBookType, setValue]);

  const currentId = watch('id');
  const divorceType = watch('divorce_type');
  const cohabiting = watch('cohabiting');
  const feeType = watch('fee_type');
  const divorceInclusionDate = watch('inclusion_date');
  const divorceInclusionHijri = watch('inclusion_hijri');

  useEffect(() => {
    if (!divorceInclusionDate) {
      if (divorceInclusionHijri) {
        setValue('inclusion_hijri', '');
      }
      return;
    }
    const hijri = convertToHijri(divorceInclusionDate);
    if (hijri && hijri !== divorceInclusionHijri) {
      setValue('inclusion_hijri', hijri);
    }
  }, [divorceInclusionDate, divorceInclusionHijri, setValue]);

  const availableFeeTypes = useMemo(
    () => divorceFeeOptions[divorceType ?? 'bain'] ?? [],
    [divorceType],
  );
  const [isDivorceTableFullscreen, setIsDivorceTableFullscreen] = useState(false);

  useEffect(() => {
    if (!availableFeeTypes.length) return;
    if (!feeType || !availableFeeTypes.includes(feeType)) {
      setValue('fee_type', availableFeeTypes[0]);
    }
  }, [availableFeeTypes, feeType, setValue]);

  const filteredDivorceList = useMemo(() => {
    if (!list) return [];
    if (!dateSearch) return list;
    return list.filter((item) => item.inclusion_date?.startsWith(dateSearch));
  }, [list, dateSearch]);

  const handleDivorceSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cin = cinSearch.trim();
    const type = typeSearch.trim();
    setFilters({
      cin: cin || undefined,
      divorce_type: type || undefined,
    });
  };

  const clearDivorceSearch = () => {
    setCinSearch('');
    setTypeSearch('');
    setDateSearch('');
    setFilters(undefined);
  };

  type DivorceTableColumn = {
    label: string;
    key?: keyof DivorceRecord;
    className?: string;
    render?: (row: DivorceRecord, index: number) => React.ReactNode;
  };

  const divorceCompactColumns: DivorceTableColumn[] = [
    { label: '#', render: (_row, index) => index + 1, className: 'text-center w-10' },
    { label: 'نوع الطلاق', key: 'divorce_type' },
    { label: 'تاريخ التضمين', key: 'inclusion_date' },
    { label: 'التاريخ (هجري)', key: 'inclusion_hijri' },
    { label: 'أسماء الأطراف', render: (row) => `${row.husband_name ?? '—'} / ${row.wife_name ?? '—'}` },
    { label: 'أرقام البطاقة', render: (row) => `${row.husband_cin ?? '—'} / ${row.wife_cin ?? '—'}` },
  ];

  const divorceExpandedColumns: DivorceTableColumn[] = [
    ...divorceCompactColumns,
    { label: 'نوع الرسم', key: 'fee_type' },
    { label: 'تاريخ الإشهاد', key: 'divorce_witnessing_date' },
    { label: 'رقم الحكم', key: 'judgment_number' },
    {
      label: 'ضمن كناش الطلاق',
      render: (row) =>
        [
          row.divorce_registry_book_type,
          row.divorce_registry_number,
          row.divorce_registry_count,
          row.divorce_registry_letter,
          row.divorce_registry_page,
        ]
          .filter((value) => value != null && value !== '')
          .join(' / ') || '—',
    },
    {
      label: 'مراجع رسم الزواج ضمن الكناش',
      render: (row) =>
        [row.marriage_registry_number, row.marriage_registry_count, row.marriage_registry_page]
          .filter((value) => value != null && value !== '')
          .join(' / ') || '—',
    },
    {
      label: 'ملاحظات',
      render: (row) => (
        <div className="space-y-1">
          <div>{row.nationality || '—'}</div>
          {row.occupations && <div className="text-slate-500">{row.occupations}</div>}
          {row.document_url && (
            <button
              className="btn-secondary text-xs"
              type="button"
              onClick={() => window.open(row.document_url as string, '_blank', 'noopener,noreferrer')}
            >
              فتح الوثيقة
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderDivorceTable = (columns: DivorceTableColumn[]) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
      <table className="min-w-full text-xs md:text-sm rtl:text-right">
        <thead className="bg-slate-200 text-slate-900">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={`p-2 ${column.className ?? ''}`}>
                {column.label}
              </th>
            ))}
            <th className="p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredDivorceList.map((row, index) => (
            <tr key={row.id ?? index} className="border-t border-slate-300">
              {columns.map((column) => (
                <td key={column.label} className={`p-2 ${column.className ?? ''}`}>
                  {column.render ? column.render(row as DivorceRecord, index) : (row as DivorceRecord)[column.key ?? '']}
                </td>
              ))}
              <td className="p-2">
                <div className="flex gap-2">
                  <button className="btn-secondary" type="button" onClick={() => handleDivorceEdit(row as DivorceRecord)}>
                    تعديل
                  </button>
                  <button className="btn-danger" type="button" onClick={() => row.id && remove.mutate({ id: row.id })}>
                    مسح
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!filteredDivorceList.length && (
            <tr>
              <td className="p-4 text-center text-slate-500" colSpan={columns.length + 1}>
                لا توجد سجلات متاحة حالياً.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const onSubmit = handleSubmit((values) => {
    const payload = { ...values, uploaded_file: pendingUpload || undefined };
    if (values.id) {
      update.mutate(payload, {
        onSuccess: () => showSuccessMessage('تم تحديث رسم الطلاق بنجاح'),
        onError: (error) => showErrorMessage('تعذر تحديث رسم الطلاق', error),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset(defaultDivorceValues);
          resetLocalDocument();
          setRemoteDocument();
        },
      });
    }
  });

  const handlePrint = () => window.print();

  const handleResetForm = () => {
    reset(defaultDivorceValues);
    resetLocalDocument();
    setRemoteDocument();
  };

  const handleDivorceEdit = (record: DivorceRecord) => {
    reset(record as DivorceRecord);
    if (record.document_url && record.document_name) {
      setRemoteDocument({ name: record.document_name, url: record.document_url });
    } else {
      setRemoteDocument();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold text-slate-900">رسوم الطلاق</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleDivorceSearch}>
          <input
            className="input"
            placeholder="البطاقة الوطنية أو الاسم الكامل"
            value={cinSearch}
            onChange={(event) => setCinSearch(event.target.value)}
          />
          <select className="input" value={typeSearch} onChange={(event) => setTypeSearch(event.target.value)}>
            <option value="">نوع الطلاق</option>
            {divorceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input className="input" type="date" value={dateSearch} onChange={(event) => setDateSearch(event.target.value)} />
          <div className="flex items-center gap-2">
            <button className="btn-primary flex-1" type="submit">
              بحث
            </button>
            <button className="btn-secondary flex-1" type="button" onClick={clearDivorceSearch}>
              مسح
            </button>
          </div>
        </form>
      </div>

      <section className="space-y-3 banana-card relative">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-slate-900">جدول الرسوم</h4>
          <button className="btn-secondary text-xs" type="button" onClick={() => setIsDivorceTableFullscreen(true)}>
            تكبير
          </button>
        </div>
        {renderDivorceTable(divorceCompactColumns)}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <aside className="space-y-4 banana-card">
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-slate-900">ضمن كناش الطلاق</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                className="input"
                placeholder="رقم"
                type="number"
                {...register('divorce_registry_number', { valueAsNumber: true })}
              />
              <input
                className="input"
                placeholder="عدد"
                type="number"
                {...register('divorce_registry_count', { valueAsNumber: true })}
              />
              <input
                className="input"
                placeholder="صحيفة"
                type="number"
                {...register('divorce_registry_page', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-base font-semibold text-slate-900">مراجع رسم الزواج ضمن الكناش</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="input" placeholder="رقم" {...register('marriage_registry_number')} />
              <input
                className="input"
                placeholder="عدد"
                type="number"
                {...register('marriage_registry_count', { valueAsNumber: true })}
              />
              <input
                className="input"
                placeholder="صحيفة"
                type="number"
                {...register('marriage_registry_page', { valueAsNumber: true })}
              />
            </div>
          </div>

          {localDocument && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div>تم اختيار ملف محلي: {localDocument.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={openLocalDocument}>
                  فتح الملف
                </button>
                <button className="btn-secondary" type="button" onClick={() => resetLocalDocument()}>
                  إزالة الملف
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={handleFetch}>
              جلب الرسم
            </button>
            <button className="btn-secondary" type="button" onClick={handlePrint}>
              نظير الرسم
            </button>
            <button className="btn-secondary" type="button" onClick={handleResetForm}>
              جديد
            </button>
            {currentId && (
              <button
                className="btn-danger"
                type="button"
                onClick={() => remove.mutate({ id: currentId })}
              >
                حذف
              </button>
            )}
          </div>
        </aside>

        <section className="space-y-3 banana-card">
          <h4 className="text-base font-semibold text-slate-900">بيانات رسم الطلاق</h4>
          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select className="input" {...register('divorce_type')}>
                {divorceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select className="input" {...register('fee_type')}>
                {availableFeeTypes.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" type="date" {...register('inclusion_date')} />
              <input className="input" placeholder="تاريخ تضمين الرسم (هجري)" {...register('inclusion_hijri')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="اسم المطلق" {...register('husband_name')} />
              <input className="input" placeholder="البطاقة الوطنية للمطلق" {...register('husband_cin')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="اسم المطلقة" {...register('wife_name')} />
              <input className="input" placeholder="البطاقة الوطنية للمطلقة" {...register('wife_cin')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="رقم الحكم بالطلاق" {...register('judgment_number')} />
              <input className="input" type="date" {...register('divorce_witnessing_date')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="الجنسية أو الملاحظات" {...register('nationality')} />
              <input
                className="input"
                type="number"
                placeholder="عدد الأطفال"
                {...register('number_of_children', { valueAsNumber: true })}
              />
            </div>

            <textarea className="input" rows={3} placeholder="المهن أو الملاحظات" {...register('occupations')} />

            {(divorceType === 'bain' || divorceType === 'khul') && (
              <select
                className="input"
                value={cohabiting == null ? '' : cohabiting ? 'after' : 'before'}
                onChange={(event) => {
                  const value = event.target.value;
                  setValue('cohabiting', value === '' ? null : value === 'after');
                }}
              >
                <option value="">حالة الدخول</option>
                <option value="after">بعد الدخول</option>
                <option value="before">قبل الدخول</option>
              </select>
            )}

            <div className="mt-2 flex flex-wrap justify-between gap-2">
              <button className="btn-secondary" type="button" onClick={() => reset(defaultDivorceValues)}>
                إعادة ضبط
              </button>
              <button className="btn-primary" type="submit">
                {currentId ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {isDivorceTableFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur">
          <div className="flex h-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg">جدول الرسوم</h4>
              <button className="btn-secondary text-xs" type="button" onClick={() => setIsDivorceTableFullscreen(false)}>
                إغلاق
              </button>
            </div>
            <div className="flex-1 overflow-auto">{renderDivorceTable(divorceExpandedColumns)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
function PropertySection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const { data: list } = trpc.propertyFees.list.useQuery(
    search.trim() ? { search } : undefined,
  );
  const create = trpc.propertyFees.create.useMutation({
    onSuccess: () => {
      utils.propertyFees.list.invalidate();
      setCurrentStep(1);
    },
    onError: (error) => showErrorMessage('تعذر حفظ رسم الأملاك', error),
  });
  const update = trpc.propertyFees.update.useMutation({
    onSuccess: () => utils.propertyFees.list.invalidate(),
  });
  const remove = trpc.propertyFees.delete.useMutation({
    onSuccess: () => utils.propertyFees.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, setValue, watch, control } = useForm<PropertyFee>({
    resolver: zodResolver(propertyFeeSchema),
  });
  const {
    localDocument: propertyLocalDocument,
    pendingUpload: propertyPendingUpload,
    fileInputRef: propertyFileInputRef,
    handleFetch: handlePropertyFetch,
    handleFileChange: handlePropertyFileChange,
    resetLocalDocument: resetPropertyLocalDocument,
    openLocalDocument: openPropertyLocalDocument,
    setRemoteDocument: setPropertyRemoteDocument,
  } = useLocalDocumentField(setValue, 'source_document_ref', {
    documentUrlField: 'document_url',
    documentNameField: 'document_name',
  });

  const { fields: buyerFields, append: appendBuyer, remove: removeBuyer } = useFieldArray({
    control,
    name: 'buyers_list',
  });
  const { fields: sellerFields, append: appendSeller, remove: removeSeller } = useFieldArray({
    control,
    name: 'sellers_list',
  });

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    if (!id && !watch('inclusion_date')) {
      setValue('inclusion_date', now.gregorian.slice(0, 10));
    }
    if (!id && !watch('inclusion_hijri')) {
      setValue('inclusion_hijri', now.hijri);
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    const payload = { ...values, uploaded_file: propertyPendingUpload || undefined };
    if (values.id) {
      update.mutate(payload);
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset();
          resetPropertyLocalDocument();
          setPropertyRemoteDocument();
          showSuccessMessage('تم حفظ رسم الأملاك بنجاح');
        },
      });
    }
  });

  const currentId = watch('id');
  const purchaseMethod = watch('purchase_method');
  const isPurchaseFlow = purchaseMethod === 'بيع' || purchaseMethod === 'شراء';
  const propertyInclusionDate = watch('inclusion_date');
  const propertyInclusionHijri = watch('inclusion_hijri');
  useEffect(() => {
    if (!propertyInclusionDate) {
      if (propertyInclusionHijri) {
        setValue('inclusion_hijri', '');
      }
      return;
    }
    const hijri = convertToHijri(propertyInclusionDate);
    if (hijri && hijri !== propertyInclusionHijri) {
      setValue('inclusion_hijri', hijri);
    }
  }, [propertyInclusionDate, propertyInclusionHijri, setValue]);
  const handlePropertyPrint = () => window.print();
  const handlePropertyNew = () => {
    reset();
    resetPropertyLocalDocument();
    setCurrentStep(1);
  };
  const handlePropertyEdit = (record: PropertyFee) => {
    reset(record as PropertyFee);
    setCurrentStep(1);
    if (record.document_url && record.document_name) {
      setPropertyRemoteDocument({ name: record.document_name, url: record.document_url });
    } else {
      setPropertyRemoteDocument();
    }
  };

  const handleAddBuyer = () => {
    appendBuyer({
      name: '',
      cin: '',
      parents_names: '',
      home_address: '',
      fraction: null,
    });
  };

  const handleAddSeller = () => {
    appendSeller({
      name: '',
      cin: '',
      parents_names: '',
      home_address: '',
      fraction: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr,1.35fr]">
        {/* جدول ورسوم الأملاك */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">رسوم الأملاك</h3>

          <form
            className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow md:flex-row md:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch((e.currentTarget.search as any).value || '');
            }}
          >
            <input
              className="input flex-1"
              name="search"
              placeholder="بحث بالأسماء أو البطاقة الوطنية لأطراف الرسم"
              defaultValue={search}
            />
            <div className="flex gap-2">
              <button className="btn-primary" type="submit">
                بحث
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setSearch('')}
              >
                مسح البحث
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full text-sm rtl:text-right">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">نوع الرسم</th>
                  <th className="p-2">تاريخ تضمين الرسم</th>
                  <th className="p-2">أسماء أطراف الرسم</th>
                  <th className="p-2">البطاقة الوطنية</th>
                  <th className="p-2">الطرف المفوت</th>
                  <th className="p-2">مراجع مستندات الرسم</th>
                  <th className="p-2">مرجع كناش الأملاك</th>
                  <th className="p-2">إحداثيات العقار</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list?.map((row, index) => (
                  <tr key={row.id ?? index} className="border-t border-slate-200">
                    <td className="p-2 text-center">{index + 1}</td>
                    <td className="p-2">{row.fee_type}</td>
                    <td className="p-2">{row.inclusion_date}</td>
                    <td className="p-2">{row.parties_names}</td>
                    <td className="p-2">{row.parties_cin}</td>
                    <td className="p-2">{row.transferor_name}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div>{row.source_document_ref || '—'}</div>
                        {row.document_url && (
                          <button
                            className="btn-secondary text-xs"
                            type="button"
                            onClick={() => window.open(row.document_url as string, '_blank', 'noopener,noreferrer')}
                          >
                            فتح الوثيقة
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      {[
                        row.registry_book_type,
                        row.registry_number,
                        row.registry_count,
                        row.registry_letter,
                        row.registry_page,
                      ]
                        .filter((v) => v != null && v !== '')
                        .join(' / ')}
                    </td>
                    <td className="p-2">{row.property_coordinates}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => handlePropertyEdit(row as PropertyFee)}
                        >
                          تعديل
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          onClick={() => row.id && remove.mutate({ id: row.id })}
                        >
                          مسح
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list?.length && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={10}>
                      لا توجد سجلات مطابقة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* نموذج الأملاك - Stepped Form */}
        <section className="space-y-3 banana-card">
          <h4 className="text-base font-semibold text-slate-900">بطاقة رسم الأملاك</h4>

          <form className="space-y-3" onSubmit={onSubmit}>
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="space-y-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
                <div>
                  <h5 className="font-semibold text-blue-900">الخطوة الأولى: نوع الرسم والتاريخ</h5>
                  <p className="text-xs text-blue-700">اختر نوع الرسم والتواريخ المتعلقة به</p>
                </div>
                <div className="space-y-2 rounded bg-white p-3">
                  <select className="input" {...register('purchase_method')}>
                    <option value="">طريقة الشراء *</option>
                    <option value="بيع">بيع</option>
                    <option value="شراء">شراء</option>
                    <option value="اعترافا">اعترافا</option>
                    <option value="هبة">هبة</option>
                    <option value="وصية">وصية</option>
                  </select>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input className="input" type="date" {...register('inclusion_date')} placeholder="تاريخ التضمين *" />
                    <input className="input" placeholder="التاريخ الهجري" {...register('inclusion_hijri')} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="space-y-3 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                <div>
                  <h5 className="font-semibold text-green-900">الخطوة الثانية: تعريف الأطراف</h5>
                  <p className="text-xs text-green-700">أدخل بيانات الأطراف الكاملة في البطاقة الوطنية</p>
                </div>
                <div className="space-y-2 rounded bg-white p-3">
                  <input className="input" placeholder="أسماء جميع أطراف الرسم *" {...register('parties_names')} />
                  <input className="input" placeholder="أرقام البطاقة الوطنية *" {...register('parties_cin')} />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <div className="space-y-3 rounded-lg border-l-4 border-purple-500 bg-purple-50 p-4">
                <div>
                  <h5 className="font-semibold text-purple-900">الخطوة الثالثة: تفاصيل الملكية</h5>
                  <p className="text-xs text-purple-700">أدخل تفاصيل المقار والموارد التصرفية</p>
                </div>
                <div className="space-y-2 rounded bg-white p-3">
                  <p className="font-semibold text-slate-700">بيانات البائع/المفوت</p>
                  <input className="input text-sm" placeholder="اسم البائع/المفوت *" {...register('transferor_name')} />
                  <input className="input text-sm" placeholder="أسماء والدي البائع *" {...register('transferor_parents_names')} />
                  <input className="input text-sm" placeholder="عنوان سكن البائع *" {...register('transferor_home_address')} />
                  <div className="flex justify-end">
                    <button className="btn-secondary text-xs" type="button" onClick={handleAddSeller}>
                      + إضافة بائع
                    </button>
                  </div>
                </div>

                <div className="space-y-3 rounded bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-700">سجل البائعين الإضافيين</p>
                      <p className="text-xs text-slate-500">كل بائع يضاف هنا يتم حفظه ضمن الرسم</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!sellerFields.length && (
                      <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3 text-xs text-slate-600">
                        لم يتم إدخال بائعين إضافيين بعد. استخدم زر &quot;إضافة بائع&quot; لتسجيل بائعين آخرين.
                      </p>
                    )}

                    {sellerFields.map((seller, index) => (
                      <div
                        key={seller.id}
                        className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between text-sm font-semibold text-slate-700">
                          <span>البائع رقم {index + 1}</span>
                          <button
                            className="btn-danger text-xs"
                            type="button"
                            onClick={() => removeSeller(index)}
                          >
                            إزالة
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            className="input text-sm"
                            placeholder="الاسم الكامل للبائع *"
                            {...register(`sellers_list.${index}.name` as const)}
                          />
                          <input
                            className="input text-sm"
                            placeholder="رقم البطاقة الوطنية"
                            {...register(`sellers_list.${index}.cin` as const)}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            className="input text-sm"
                            placeholder="أسماء والدي البائع"
                            {...register(`sellers_list.${index}.parents_names` as const)}
                          />
                          <input
                            className="input text-sm"
                            placeholder="عنوان سكن البائع"
                            {...register(`sellers_list.${index}.home_address` as const)}
                          />
                        </div>

                        <input
                          className="input text-sm"
                          type="number"
                          step="any"
                          placeholder="نسبة الحصة في التفويت (اختياري)"
                          {...register(`sellers_list.${index}.fraction` as const, { valueAsNumber: true })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {isPurchaseFlow && (
                  <div className="space-y-3 rounded bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-700">بيانات المشترين</p>
                        <p className="text-xs text-slate-500">أضف كل مشترٍ على حدة مع بياناته الكاملة</p>
                      </div>
                      <button className="btn-secondary text-xs" type="button" onClick={handleAddBuyer}>
                        + إضافة مشتري
                      </button>
                    </div>

                    <div className="space-y-3">
                      {!buyerFields.length && (
                        <p className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-3 text-xs text-slate-600">
                          لا توجد بيانات للمشترين بعد. اضغط زر "إضافة مشتري" لتسجيل البيانات.
                        </p>
                      )}

                      {buyerFields.map((buyer, index) => (
                        <div
                          key={buyer.id}
                          className="space-y-2 rounded-2xl border border-purple-200 bg-purple-50/60 p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between text-sm font-semibold text-slate-700">
                            <span>المشتري رقم {index + 1}</span>
                            <button
                              className="btn-danger text-xs"
                              type="button"
                              onClick={() => removeBuyer(index)}
                            >
                              إزالة
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                              className="input text-sm"
                              placeholder="الاسم الكامل للمشتري *"
                              {...register(`buyers_list.${index}.name` as const)}
                            />
                            <input
                              className="input text-sm"
                              placeholder="رقم البطاقة الوطنية *"
                              {...register(`buyers_list.${index}.cin` as const)}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                              className="input text-sm"
                              placeholder="أسماء والدي المشتري"
                              {...register(`buyers_list.${index}.parents_names` as const)}
                            />
                            <input
                              className="input text-sm"
                              placeholder="عنوان سكن المشتري"
                              {...register(`buyers_list.${index}.home_address` as const)}
                            />
                          </div>

                          <input
                            className="input text-sm"
                            type="number"
                            step="any"
                            placeholder="نسبة الحصة في الشراء (اختياري)"
                            {...register(`buyers_list.${index}.fraction` as const, { valueAsNumber: true })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div className="space-y-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
                <div>
                  <h5 className="font-semibold text-amber-900">الخطوة الرابعة: خصائص العقار</h5>
                  <p className="text-xs text-amber-700">أدخل أبعاد العقار والإحداثيات الجغرافية</p>
                </div>
                <div className="space-y-2 rounded bg-white p-3">
                  <p className="font-semibold text-slate-700">أبعاد العقار</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input className="input" type="number" placeholder="الطول (متر)" {...register('property_length_m', { valueAsNumber: true })} />
                    <input className="input" type="number" placeholder="العرض (متر)" {...register('property_width_m', { valueAsNumber: true })} />
                    <input className="input" type="number" placeholder="المساحة (م²)" {...register('property_area_m2', { valueAsNumber: true })} />
                  </div>
                  <p className="mt-3 font-semibold text-slate-700">الإحداثيات الجغرافية</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input className="input" type="number" placeholder="خط العرض (Latitude)" step="any" {...register('geo_latitude', { valueAsNumber: true })} />
                    <input className="input" type="number" placeholder="خط الطول (Longitude)" step="any" {...register('geo_longitude', { valueAsNumber: true })} />
                  </div>
                  <textarea className="input" rows={2} placeholder="وصف إحداثيات العقار" {...register('property_coordinates')} />
                </div>
              </div>
            )}

            {/* Step 5 */}
            {currentStep === 5 && (
              <div className="space-y-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
                <div>
                  <h5 className="font-semibold text-red-900">الخطوة الخامسة: التواريخ والمراجع</h5>
                  <p className="text-xs text-red-700">أدخل التواريخ والمراجع الهامة للرسم</p>
                </div>
                <div className="space-y-2 rounded bg-white p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input className="input" placeholder="نوع الكناش" {...register('registry_book_type')} />
                    <input className="input" type="number" placeholder="رقم الكناش" {...register('registry_number', { valueAsNumber: true })} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input className="input" type="number" placeholder="العدد" {...register('registry_count', { valueAsNumber: true })} />
                    <input className="input" placeholder="الحرف/الصفحة" {...register('registry_letter')} />
                  </div>
                  <textarea className="input" rows={2} placeholder="المراجع والملاحظات" {...register('source_document_ref')} />
                </div>

                {propertyLocalDocument && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <div>تم اختيار ملف محلي: {propertyLocalDocument.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="btn-secondary" type="button" onClick={openPropertyLocalDocument}>
                        فتح الملف
                      </button>
                      <button className="btn-secondary" type="button" onClick={() => resetPropertyLocalDocument()}>
                        إزالة الملف
                      </button>
                    </div>
                  </div>
                )}

                <input ref={propertyFileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handlePropertyFileChange} />
                <input type="hidden" {...register('document_url')} />
                <input type="hidden" {...register('document_name')} />
              </div>
            )}

            {/* Navigation and Action Buttons */}
            <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {currentStep > 1 && (
                  <button className="btn-secondary" type="button" onClick={() => setCurrentStep(currentStep - 1)}>
                    ← السابق
                  </button>
                )}
                {currentStep < 5 && (
                  <button className="btn-secondary" type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                    التالي →
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {currentStep === 5 && (
                  <>
                    <button className="btn-secondary" type="button" onClick={handlePropertyFetch}>
                      جلب الرسم
                    </button>
                    <button className="btn-secondary" type="button" onClick={handlePropertyPrint}>
                      نظير الرسم
                    </button>
                    <button className="btn-secondary" type="button" onClick={handlePropertyNew}>
                      جديد
                    </button>
                    {currentId && (
                      <button className="btn-danger" type="button" onClick={() => currentId && remove.mutate({ id: currentId })}>
                        مسح
                      </button>
                    )}
                    <button className="btn-primary" type="submit">
                      {currentId ? 'تعديل' : 'إضافة'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function InheritanceSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const { data: rawList } = trpc.inheritanceFees.list.useQuery();
  const list = useMemo(() => {
    if (!rawList) return [];
    if (!search.trim()) return rawList;
    const q = search.trim().toLowerCase();
    return rawList.filter((r) =>
      [r.fee_type, r.deceased_name, r.heirs_names, r.applicants_cin, r.document_references]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rawList, search]);
  const create = trpc.inheritanceFees.create.useMutation({
    onSuccess: () => {
      utils.inheritanceFees.list.invalidate();
    },
    onError: (error) => showErrorMessage('تعذر حفظ رسم التركات', error),
  });
  const update = trpc.inheritanceFees.update.useMutation({
    onSuccess: () => utils.inheritanceFees.list.invalidate(),
  });
  const remove = trpc.inheritanceFees.delete.useMutation({
    onSuccess: () => utils.inheritanceFees.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<InheritanceFee>({
    resolver: zodResolver(inheritanceFeeSchema),
  });
  const {
    localDocument: inheritanceLocalDocument,
    pendingUpload: inheritancePendingUpload,
    fileInputRef: inheritanceFileInputRef,
    handleFetch: handleInheritanceFetch,
    handleFileChange: handleInheritanceFileChange,
    resetLocalDocument: resetInheritanceLocalDocument,
    openLocalDocument: openInheritanceLocalDocument,
    setRemoteDocument: setInheritanceRemoteDocument,
  } = useLocalDocumentField(setValue, 'document_references', {
    documentUrlField: 'document_url',
    documentNameField: 'document_name',
  });

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    if (!id && !watch('inclusion_date')) {
      setValue('inclusion_date', now.gregorian.slice(0, 10));
    }
    if (!id && !watch('inclusion_hijri')) {
      setValue('inclusion_hijri', now.hijri);
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    const payload = { ...values, uploaded_file: inheritancePendingUpload || undefined };
    if (values.id) {
      update.mutate(payload);
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset();
          resetInheritanceLocalDocument();
          setInheritanceRemoteDocument();
          showSuccessMessage('تم حفظ رسم التركات بنجاح');
        },
      });
    }
  });

  const currentId = watch('id');
  const inheritanceInclusionDate = watch('inclusion_date');
  const inheritanceInclusionHijri = watch('inclusion_hijri');
  useEffect(() => {
    if (!inheritanceInclusionDate) {
      if (inheritanceInclusionHijri) {
        setValue('inclusion_hijri', '');
      }
      return;
    }
    const hijri = convertToHijri(inheritanceInclusionDate);
    if (hijri && hijri !== inheritanceInclusionHijri) {
      setValue('inclusion_hijri', hijri);
    }
  }, [inheritanceInclusionDate, inheritanceInclusionHijri, setValue]);
  const handleInheritancePrint = () => window.print();
  const handleInheritanceNew = () => {
    reset();
    resetInheritanceLocalDocument();
  };
  const handleInheritanceEdit = (record: InheritanceFee) => {
    reset(record as InheritanceFee);
    if (record.document_url && record.document_name) {
      setInheritanceRemoteDocument({ name: record.document_name, url: record.document_url });
    } else {
      setInheritanceRemoteDocument();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr,1.35fr]">
        {/* جدول ورسوم التركات */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">رسوم التركات</h3>

          <form
            className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow md:flex-row md:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch((e.currentTarget.search as any).value || '');
            }}
          >
            <input
              className="input flex-1"
              name="search"
              placeholder="بحث بأسماء طالبي الشهادة أو اسم المتوفى أو المراجع"
              defaultValue={search}
            />
            <div className="flex gap-2">
              <button className="btn-primary" type="submit">
                بحث
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setSearch('')}
              >
                مسح البحث
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full text-sm rtl:text-right">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">نوع الرسم</th>
                  <th className="p-2">تاريخ تضمين الرسم</th>
                  <th className="p-2">اسم المتوفى</th>
                  <th className="p-2">أسماء طالبي الشهادة</th>
                  <th className="p-2">البطاقة الوطنية</th>
                  <th className="p-2">مراجع مستند الرسم</th>
                  <th className="p-2">مرجع كناش التركات</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list?.map((row, index) => (
                  <tr key={row.id ?? index} className="border-t border-slate-200">
                    <td className="p-2 text-center">{index + 1}</td>
                    <td className="p-2">{row.fee_type}</td>
                    <td className="p-2">{row.inclusion_date}</td>
                    <td className="p-2">{row.deceased_name}</td>
                    <td className="p-2">{row.heirs_names}</td>
                    <td className="p-2">{row.applicants_cin}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div>{row.document_references || '—'}</div>
                        {row.document_url && (
                          <button
                            className="btn-secondary text-xs"
                            type="button"
                            onClick={() => window.open(row.document_url as string, '_blank', 'noopener,noreferrer')}
                          >
                            فتح الوثيقة
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      {[
                        row.registry_book_type,
                        row.registry_number,
                        row.registry_count,
                        row.registry_letter,
                        row.registry_page,
                      ]
                        .filter((v) => v != null && v !== '')
                        .join(' / ')}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => handleInheritanceEdit(row as InheritanceFee)}
                        >
                          تعديل
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          onClick={() => row.id && remove.mutate({ id: row.id })}
                        >
                          مسح
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list?.length && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={9}>
                      لا توجد سجلات مطابقة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* نموذج التركات */}
        <section className="space-y-3 banana-card">
          <h4 className="text-base font-semibold text-slate-900">بطاقة رسم التركات</h4>

          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select className="input" {...register('fee_type')}>
                <option value="">نوع الرسم</option>
                {inheritanceFeeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input className="input" type="date" {...register('inclusion_date')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="تاريخ تضمين الرسم (هجري)"
                {...register('inclusion_hijri')}
              />
              <input className="input" placeholder="اسم المتوفى" {...register('deceased_name')} />
            </div>

            <textarea
              className="input"
              rows={2}
              placeholder="أسماء طالبي الشهادة / الورثة"
              {...register('heirs_names')}
            />

            <input
              className="input"
              placeholder="البطاقة الوطنية لطالبي الشهادة"
              {...register('applicants_cin')}
            />

            <textarea
              className="input"
              rows={2}
              placeholder="مراجع مستندات الرسم (أحكام، رسوم، شواهد...)"
              {...register('document_references')}
            />

            {inheritanceLocalDocument && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div>تم اختيار ملف محلي: {inheritanceLocalDocument.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={openInheritanceLocalDocument}>
                    فتح الملف
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => resetInheritanceLocalDocument()}
                  >
                    إزالة الملف
                  </button>
                </div>
              </div>
            )}

            <input
              ref={inheritanceFileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleInheritanceFileChange}
            />
            <input type="hidden" {...register('document_url')} />
            <input type="hidden" {...register('document_name')} />

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">ضمن كناش التركات</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                <input className="input" placeholder="حرف / صفحة" {...register('registry_letter')} />
              </div>
              <input
                className="input"
                type="number"
                placeholder="صفحة"
                {...register('registry_page', { valueAsNumber: true })}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={handleInheritanceFetch}>
                جلب الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleInheritancePrint}>
                نظير الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleInheritanceNew}>
                جديد
              </button>
              {currentId && (
                <button
                  className="btn-danger"
                  type="button"
                  onClick={() => currentId && remove.mutate({ id: currentId })}
                >
                  مسح
                </button>
              )}
              <button className="btn-primary" type="submit">
                {currentId ? 'تعديل' : 'إضافة'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function OtherDocumentsSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const { data: rawList } = trpc.otherDocumentFees.list.useQuery();
  const list = useMemo(() => {
    if (!rawList) return [];
    if (!search.trim()) return rawList;
    const q = search.trim().toLowerCase();
    return rawList.filter((r) =>
      [r.fee_type, r.parties_names, r.national_ids, r.document_references]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rawList, search]);
  const create = trpc.otherDocumentFees.create.useMutation({
    onSuccess: () => {
      utils.otherDocumentFees.list.invalidate();
    },
    onError: (error) => showErrorMessage('تعذر حفظ رسم باقي الوثائق', error),
  });
  const update = trpc.otherDocumentFees.update.useMutation({
    onSuccess: () => utils.otherDocumentFees.list.invalidate(),
  });
  const remove = trpc.otherDocumentFees.delete.useMutation({
    onSuccess: () => utils.otherDocumentFees.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<OtherDocumentFee>({
    resolver: zodResolver(otherDocumentFeeSchema),
    defaultValues: { fee_type: otherDocumentFeeTypes[0] },
  });
  const {
    localDocument: otherLocalDocument,
    pendingUpload: otherPendingUpload,
    fileInputRef: otherFileInputRef,
    handleFetch: handleOtherFetch,
    handleFileChange: handleOtherFileChange,
    resetLocalDocument: resetOtherLocalDocument,
    openLocalDocument: openOtherLocalDocument,
    setRemoteDocument: setOtherRemoteDocument,
  } = useLocalDocumentField(setValue, 'document_refs', {
    documentUrlField: 'document_url',
    documentNameField: 'document_name',
  });

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    if (!id && !watch('inclusion_date')) {
      setValue('inclusion_date', now.gregorian.slice(0, 10));
    }
    if (!id && !watch('inclusion_hijri')) {
      setValue('inclusion_hijri', now.hijri);
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    const payload = { ...values, uploaded_file: otherPendingUpload || undefined };
    if (values.id) {
      update.mutate(payload);
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          reset({ fee_type: otherDocumentFeeTypes[0] });
          resetOtherLocalDocument();
          setOtherRemoteDocument();
          showSuccessMessage('تم حفظ رسم باقي الوثائق بنجاح');
        },
      });
    }
  });

  const currentId = watch('id');
  const isInInheritanceRegistry = watch('is_in_inheritance_registry');
  const otherInclusionDate = watch('inclusion_date');
  const otherInclusionHijri = watch('inclusion_hijri');
  useEffect(() => {
    if (!otherInclusionDate) {
      if (otherInclusionHijri) {
        setValue('inclusion_hijri', '');
      }
      return;
    }
    const hijri = convertToHijri(otherInclusionDate);
    if (hijri && hijri !== otherInclusionHijri) {
      setValue('inclusion_hijri', hijri);
    }
  }, [otherInclusionDate, otherInclusionHijri, setValue]);
  const handleOtherPrint = () => window.print();
  const handleOtherNew = () => {
    reset({ fee_type: otherDocumentFeeTypes[0] });
    resetOtherLocalDocument();
  };
  const handleOtherEdit = (record: OtherDocumentFee) => {
    reset(record as OtherDocumentFee);
    if (record.document_url && record.document_name) {
      setOtherRemoteDocument({ name: record.document_name, url: record.document_url });
    } else {
      setOtherRemoteDocument();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr,1.35fr]">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">رسوم باقي الوثائق</h3>

          <form
            className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow md:flex-row md:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch((event.currentTarget.search as any).value || '');
            }}
          >
            <input
              className="input flex-1"
              name="search"
              placeholder="بحث بالأسماء أو نوع الرسم أو البطاقة الوطنية"
              defaultValue={search}
            />
            <div className="flex gap-2">
              <button className="btn-primary" type="submit">
                بحث
              </button>
              <button className="btn-secondary" type="button" onClick={() => setSearch('')}>
                مسح البحث
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full text-sm rtl:text-right">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">نوع الرسم</th>
                  <th className="p-2">تاريخ تضمين الرسم</th>
                  <th className="p-2">أسماء طالبي الشهادة</th>
                  <th className="p-2">البطاقة الوطنية</th>
                  <th className="p-2">مراجع مستند الرسم</th>
                  <th className="p-2">ضمن كناش التركات</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list?.map((row, index) => (
                  <tr key={row.id ?? index} className="border-t border-slate-200">
                    <td className="p-2 text-center">{index + 1}</td>
                    <td className="p-2">{row.fee_type}</td>
                    <td className="p-2">{row.inclusion_date}</td>
                    <td className="p-2">{row.applicants_names}</td>
                    <td className="p-2">{row.applicants_cin}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div>{row.document_refs || '—'}</div>
                        {row.document_url && (
                          <button
                            className="btn-secondary text-xs"
                            type="button"
                            onClick={() => window.open(row.document_url as string, '_blank', 'noopener,noreferrer')}
                          >
                            فتح الوثيقة
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      {row.is_in_inheritance_registry ? 'نعم' : 'لا'} /
                      {[
                        row.registry_number,
                        row.registry_count,
                        row.registry_page,
                      ]
                        .filter((v) => v != null && v !== '')
                        .join(' / ')}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => handleOtherEdit(row as OtherDocumentFee)}
                        >
                          تعديل
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          onClick={() => row.id && remove.mutate({ id: row.id })}
                        >
                          مسح
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list?.length && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={8}>
                      لا توجد سجلات متاحة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 banana-card">
          <h4 className="text-base font-semibold text-slate-900">بطاقة رسم باقي الوثائق</h4>

          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select className="input" {...register('fee_type')}>
                {otherDocumentFeeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input className="input" type="date" {...register('inclusion_date')} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="تاريخ تضمين الرسم (هجري)"
                {...register('inclusion_hijri')}
              />
              <input
                className="input"
                placeholder="أسماء طالبي الشهادة"
                {...register('applicants_names')}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="البطاقة الوطنية" {...register('applicants_cin')} />
              <select
                className="input"
                value={isInInheritanceRegistry == null ? '' : isInInheritanceRegistry ? 'yes' : 'no'}
                onChange={(event) => {
                  const value = event.target.value;
                  setValue(
                    'is_in_inheritance_registry',
                    value === '' ? null : value === 'yes',
                  );
                }}
              >
                <option value="">ضمن كناش التركات؟</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
              </select>
            </div>

            <textarea
              className="input"
              rows={2}
              placeholder="مراجع مستند الرسم"
              {...register('document_refs')}
            />

            {otherLocalDocument && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div>تم اختيار ملف محلي: {otherLocalDocument.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={openOtherLocalDocument}>
                    فتح الملف
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => resetOtherLocalDocument()}>
                    إزالة الملف
                  </button>
                </div>
              </div>
            )}

            <input
              ref={otherFileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleOtherFileChange}
            />
            <input type="hidden" {...register('document_url')} />
            <input type="hidden" {...register('document_name')} />

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">مراجع ضمن كناش التركات</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                <input
                  className="input"
                  type="number"
                  placeholder="صفحة"
                  {...register('registry_page', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={handleOtherFetch}>
                جلب الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleOtherPrint}>
                نظير الرسم
              </button>
              <button className="btn-secondary" type="button" onClick={handleOtherNew}>
                جديد
              </button>
              {currentId && (
                <button
                  className="btn-danger"
                  type="button"
                  onClick={() => currentId && remove.mutate({ id: currentId })}
                >
                  مسح
                </button>
              )}
              <button className="btn-primary" type="submit">
                {currentId ? 'تعديل' : 'إضافة'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-sm text-slate-800 shadow">
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p>سيتم لاحقاً إكمال هذا القسم بنفس نمط التصميم.</p>
    </div>
  );
}

const LocalSavedDraftsSection = ({ onLoad }: { onLoad: (draft: FeesAgentState) => void }) => {
  const [savedState, setSavedState] = useState<FeesAgentState | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('feesAgentState');
    if (saved) {
      try {
        setSavedState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
  }, []);

  if (!savedState) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-500">لا توجد مسودات محفوظة حالياً.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-4">المسودات المحفوظة</h3>
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer" onClick={() => onLoad(savedState)}>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-lg text-blue-600">{savedState.documentType || 'مسودة غير معنونة'}</h4>
            <p className="text-sm text-gray-600">رقم الملف: {savedState.meta.fileNumber}</p>
            <p className="text-sm text-gray-600">التاريخ: {savedState.meta.dateGregorian}</p>
          </div>
          <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200">
            استكمال العمل ←
          </button>
        </div>
      </div>
    </div>
  );
};

const SavedDraftsSection = ({ onLoad }: { onLoad: (draft: FeesAgentState) => void }) => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const listQuery = trpc.feesAgent.documents.listSavedRasms.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );
  const detailQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: activeId || '00000000-0000-0000-0000-000000000000' },
    { enabled: !!sessionToken && !!activeId, retry: false }
  );
  const deleteMutation = trpc.feesAgent.documents.deleteSavedRasm.useMutation();

  const handleDelete = async (id: string) => {
    if (!sessionToken) return;
    if (!confirm('هل تريد حذف هذا الرسم من المستندات الادارية المحفوظة؟')) return;
    await deleteMutation.mutateAsync({ sessionToken, id });
    if (activeId === id) setActiveId(null);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await listQuery.refetch();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const isJudgeAcceptedStatus = (status: unknown) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return ['accepted', 'accepted_with_notes', 'substantive_notes'].includes(normalizedStatus);
  };

  const handleDeleteSelected = async () => {
    if (!sessionToken || selectedIds.length === 0) return;
    if (!confirm(`هل تريد حذف ${selectedIds.length} من الرسوم المحفوظة؟`)) return;

    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync({ sessionToken, id });
      }
      if (activeId && selectedIds.includes(activeId)) setActiveId(null);
      setSelectedIds([]);
      await listQuery.refetch();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!sessionToken) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-500">يرجى تسجيل الدخول لعرض المستندات الادارية المحفوظة.</p>
      </div>
    );
  }

  if (listQuery.isLoading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-500">جاري تحميل المستندات الادارية المحفوظة...</p>
      </div>
    );
  }

  if (listQuery.error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-right text-sm text-red-700 shadow">
        تعذر تحميل المستندات الادارية المحفوظة: {listQuery.error.message}
      </div>
    );
  }

  const rows = (listQuery.data ?? []) as any[];
  const filteredRows = rows.filter((r) => {
    const query = normalizeSearchText(searchTerm);
    if (!query) return true;

    const displayPartyNames = (r.partyNames?.length ? r.partyNames : deriveSavedRasmPartyNames(r.payload)) || [];
    const haystack = normalizeSearchText([
      r.fileNumber,
      r.documentType,
      r.notaryName,
      r.judgeStatus,
      r.selectedJudgeName,
      r.judgeSentAt ? new Date(r.judgeSentAt).toLocaleString('ar-MA') : '',
      displayPartyNames.join('، '),
      JSON.stringify(r.payload || {}),
    ].join(' '));

    return haystack.includes(query);
  });
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-500">لا توجد رسوم محفوظة بعد.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
        <h3 className="mb-1 text-xl font-bold text-gray-800">المراجعة القضائية</h3>
        <p className="mb-4 text-sm text-gray-600">متابعة الرسوم المرسلة إلى القاضي مع الأطراف ووقت الإرسال واسم القاضي المكلف.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setSelectedIds(rows.map((r) => r.id))}
            disabled={rows.length === 0}
          >
            تحديد الكل
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            إلغاء التحديد
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
            disabled={selectedIds.length === 0 || isBulkDeleting || (deleteMutation as any).isLoading || deleteMutation.isPending}
            onClick={handleDeleteSelected}
          >
            {isBulkDeleting ? 'جاري الحذف...' : `حذف المحدد (${selectedIds.length})`}
          </button>
        </div>
      </div>
      <div className="mb-5 mt-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-2 text-right text-[11px] font-extrabold tracking-[0.18em] text-slate-500">
            البحث في الرسوم المحفوظة
          </div>
          <input
            type="text"
            dir="rtl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الأطراف، اسم القاضي، رقم الملف، النوع، الحالة..."
            className="w-full rounded-xl border border-white bg-white px-4 py-3 text-right text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-sky-200 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>
      <div className="space-y-3">
        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm font-bold text-slate-500">
            لا توجد نتائج مطابقة لعبارة البحث الحالية.
          </div>
        ) : filteredRows.map((r) => {
          const displayPartyNames = (r.partyNames?.length ? r.partyNames : deriveSavedRasmPartyNames(r.payload)) || [];

          return (
            <>
              <div
                key={r.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="border-b border-sky-200 bg-gradient-to-br from-sky-900 via-sky-700 to-sky-300 p-5 text-right text-white lg:border-b-0 lg:border-l lg:border-sky-200/60">
                    <div className="flex items-start justify-between gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelected(r.id)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-cyan-400 focus:ring-cyan-400"
                        aria-label={`تحديد الرسم ${r.fileNumber || r.id}`}
                      />
                      <div className="flex-1">
                        <div className="text-[11px] font-bold tracking-[0.2em] text-sky-100/90">SAVED RASM</div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-white">{r.fileNumber || r.id}</div>
                        <div className="mt-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-sky-50">
                          {r.documentType || 'غير محدد'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <div className="text-[11px] font-extrabold tracking-wide text-sky-100/90">المرفقات</div>
                        <div className="mt-2 text-sm font-bold text-white/95">{r.attachmentsCount} مرفقات</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div
                        className={`border-b px-5 py-3 text-right ${
                          r.judgeChecked
                            ? 'border-emerald-100 bg-gradient-to-r from-emerald-100/80 to-emerald-50'
                            : 'border-rose-100 bg-gradient-to-r from-rose-100/85 to-red-50'
                        }`}
                      >
                        <div
                          className={`text-[11px] font-extrabold tracking-[0.18em] ${
                            r.judgeChecked ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          الحالة القضائية
                        </div>
                      </div>
                      <div
                        className={`min-h-[108px] px-5 py-4 text-right ${
                          r.judgeChecked
                            ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50'
                            : 'bg-gradient-to-br from-rose-50 via-white to-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`h-3.5 w-3.5 rounded-full ring-4 ${
                              r.judgeChecked
                                ? 'bg-emerald-400 ring-emerald-100'
                                : 'bg-rose-400 ring-rose-100'
                            }`}
                          />
                          <div className="flex-1">
                            <div className={`text-sm font-black ${r.judgeChecked ? 'text-emerald-800' : 'text-rose-800'}`}>
                              {r.judgeChecked ? 'تمت المراجعة القضائية' : 'بانتظار المراجعة القضائية'}
                            </div>
                            <div className={`mt-1 text-[11px] font-bold ${r.judgeChecked ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>
                              {r.judgeChecked
                                ? 'تم التحقق من الرسم من طرف القاضي'
                                : 'لم تصدر موافقة قضائية على هذا الرسم بعد'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="group overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-sky-50 px-5 py-3 text-right">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-sky-700">أسماء الأطراف</div>
                      </div>
                      <div className="min-h-[108px] bg-gradient-to-br from-sky-50 via-white to-sky-50 px-5 py-4 text-right">
                        <div className="text-sm font-bold leading-7 text-slate-800">
                          {displayPartyNames.length ? displayPartyNames.join('، ') : 'غير مضمنة'}
                        </div>
                      </div>
                    </div>

                    <div className="group overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-100/80 to-violet-50 px-5 py-3 text-right">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-violet-700">وقت الإرسال</div>
                      </div>
                      <div className="min-h-[108px] bg-gradient-to-br from-violet-50 via-white to-violet-50 px-5 py-4 text-right">
                        <div className="text-sm font-bold leading-7 text-slate-800">
                          {r.judgeSentAt ? new Date(r.judgeSentAt).toLocaleString('ar-MA') : 'لم يُرسل بعد'}
                        </div>
                      </div>
                    </div>

                    <div className="group overflow-hidden rounded-[24px] border border-amber-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-100/80 to-amber-50 px-5 py-3 text-right">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-amber-700">القاضي المرسل إليه</div>
                      </div>
                      <div className="min-h-[108px] bg-gradient-to-br from-amber-50 via-white to-amber-50 px-5 py-4 text-right">
                        <div className="text-sm font-bold leading-7 text-slate-800">
                          {r.selectedJudgeName || 'غير محدد'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-extrabold text-slate-500">
                          المراجعة القضائية
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                          معرف السجل: {r.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-red-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
                          onClick={() => setActiveId((prev) => (prev === r.id ? null : r.id))}
                        >
                          {activeId === r.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                        </button>
                        <button
                          type="button"
                          className="rounded-xl bg-blue-100 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-200"
                          disabled={detailQuery.isFetching && activeId === r.id}
                          onClick={async () => {
                            setActiveId(r.id);
                            const res = await utils.feesAgent.documents.getSavedRasm.fetch({
                              sessionToken: sessionToken || '',
                              id: r.id,
                            });
                            if (!res) return;

                            const payload = ((res as any)?.payload ?? {}) as any;

                            const judgeSubmissionId =
                              payload.judgeSubmissionId || payload.step7JudgeSubmissionId || null;
                            const judgeStatus =
                              r.judgeStatus || payload.judgeSubmissionStatus || null;
                            const workflowStep =
                              payload.workflowStep || payload.step7Step || null;
                            const shouldOpenAuditHub =
                              (!!judgeSubmissionId && isJudgeAcceptedStatus(judgeStatus)) ||
                              (!!judgeSubmissionId && (workflowStep === 'inclusion' || workflowStep === 'final'));

                            if (shouldOpenAuditHub) {
                              navigate(`/dashboard?module=auditHub&id=${r.id}`);
                              return;
                            }

                            onLoad({
                              ...(payload as FeesAgentState),
                              id: r.id,
                            } as FeesAgentState);
                          }}
                        >
                          فتح للتحرير
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {activeId === r.id && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-right">
                  {detailQuery.isLoading || detailQuery.isFetching ? (
                    <div className="text-sm text-slate-600">جاري تحميل التفاصيل...</div>
                  ) : detailQuery.error ? (
                    <div className="text-sm text-red-700">تعذر تحميل التفاصيل: {detailQuery.error.message}</div>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-slate-900">المرفقات</div>
                      <div className="mt-2 space-y-2">
                        {((detailQuery.data as any)?.attachments ?? []).length === 0 ? (
                          <div className="text-sm text-slate-600">لا توجد مرفقات.</div>
                        ) : (
                          ((detailQuery.data as any)?.attachments ?? []).map((a: any) => (
                            <a
                              key={a.id}
                              href={a.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                            >
                              {a.fileName}{' '}
                              <span className="text-xs text-slate-500">
                                ({a.category}
                                {(a.metadata as any)?.field ? ` • ${String((a.metadata as any).field)}` : ''})
                              </span>
                            </a>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          );
        })}
      </div>
    </div>
  );
};

export function FeesModule() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'judicial' | 'saved'>('judicial');
  const [navSelection, setNavSelection] = useState<'intake' | 'drafting' | 'saved'>('intake');
  const [loadedDraft, setLoadedDraft] = useState<FeesAgentState | null>(null);
  const [loadedJudgeSubmissionId, setLoadedJudgeSubmissionId] = useState<string | null>(null);

  const normalizeLoadedDraft = useCallback(
    (draft: FeesAgentState, explicitId?: string | null, explicitJudgeSubmissionId?: string | null) => {
      const normalizedId = explicitId || (draft as any).id || (draft as any)._id || null;
      const judgeId =
        explicitJudgeSubmissionId ||
        (draft as any).step7JudgeSubmissionId ||
        (draft as any).judgeSubmissionId ||
        null;
      const fiscalNature =
        (draft as any).step7FiscalNature ||
        (draft as any).fiscalNature ||
        (judgeId ? ((draft as any).finance?.registeredWithTax === 'yes' ? 'subject' : 'exempt') : undefined);

      return {
        ...(draft as any),
        ...(normalizedId ? { id: normalizedId } : {}),
        ...(judgeId
          ? {
              step7JudgeSubmissionId: judgeId,
              judgeSubmissionId: judgeId,
            }
          : {}),
        ...(fiscalNature
          ? {
              step7FiscalNature: fiscalNature,
              fiscalNature,
            }
          : {}),
      } as FeesAgentState;
    },
    []
  );

  const setLocalTab = useCallback((nextTab: 'judicial' | 'saved', nextSection?: 'intake' | 'drafting' | 'saved') => {
    setTab(nextTab);
    if (nextSection) {
      setNavSelection(nextSection);
    }
  }, []);

  const handleLoadDraft = (draft: FeesAgentState) => {
    const judgeId =
      (draft as any).step7JudgeSubmissionId ||
      (draft as any).judgeSubmissionId ||
      null;
    const normalizedDraft = normalizeLoadedDraft(
      draft,
      (draft as any).id || (draft as any)._id || null,
      judgeId
    );
    setLoadedDraft(normalizedDraft);
    setLoadedJudgeSubmissionId(judgeId);
    setLocalTab('judicial', 'drafting');
  };

  const searchParams = new URLSearchParams(location.search);
  const currentModule = searchParams.get('module');
  const currentMode = searchParams.get('mode');

  const isOngoingIndexingRoute =
    (location.pathname === '/search' && currentMode === 'ongoing') ||
    (currentModule === 'indexing' && currentMode === 'ongoing') ||
    currentModule === 'ongoingIndexing';

  const isFinalIndexingRoute =
    (location.pathname === '/search' && currentMode === 'final') ||
    (currentModule === 'indexing' && currentMode === 'final') ||
    currentModule === 'finalIndexing';

  const isAuditHubRoute =
    location.pathname.includes('/dashboard') && currentModule === 'auditHub';
  const isSignedRasmsRoute = location.pathname.startsWith('/signed-rasms') || (location.pathname.includes('/dashboard') && currentModule === 'signedRasms');
  const isSavedDocumentsRoute = location.pathname.startsWith('/saved-documents') || (location.pathname.includes('/dashboard') && currentModule === 'savedDocuments');
  const isSecureArchiveRoute = location.pathname.startsWith('/secure-archive');

  useEffect(() => {
    const state = location.state as any;
    if (!state?.loadFeesAgentDraft) return;

    const judgeId =
      state.loadFeesAgentDraft?.step7JudgeSubmissionId ||
      state.loadFeesAgentDraft?.judgeSubmissionId ||
      state.judgeSubmissionId ||
      null;

    const normalizedDraft = normalizeLoadedDraft(
      state.loadFeesAgentDraft as FeesAgentState,
      (state.loadFeesAgentDraft as any)?.id || (state.savedRasmId as string | undefined) || null,
      judgeId
    );
    setLoadedDraft(normalizedDraft);
    setLoadedJudgeSubmissionId(judgeId);
    setLocalTab('judicial', 'drafting');
  }, [location.state, normalizeLoadedDraft, setLocalTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const sectionParam = params.get('section');
    setNavSelection(sectionParam === 'drafting' ? 'drafting' : 'intake');
  }, [location.search]);

  const scrollToAIDrafting = () => {
    requestAnimationFrame(() => {
      document.getElementById('ai-drafting')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800">الرسوم العدلية</h2>
              <p className="mt-1 text-sm text-gray-600">
                النظام الذكي للتدبير و للادارة الوثائقية للرسوم العدلية
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-b-2 border-gray-200 pb-3">
            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                tab === 'judicial' && navSelection === 'intake'
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => setLocalTab('judicial', 'intake')}
            >
              <span>📥</span>
              خدمة التلقي
            </button>

            <button
              type="button"
              title="تحرير وصياغة الرسوم العدلية وفق النماذج المعتمدة، باستعمال الصياغة العدلية الذكية، مع احترام الشكلية والرسمية."
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                tab === 'judicial' && navSelection === 'drafting'
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => {
                setLocalTab('judicial', 'drafting');
                scrollToAIDrafting();
              }}
            >
              <span>✍️</span>
              التحرير والصياغة
            </button>

            <button
              type="button"
              title="تضمين الرسوم المعتمدة في سجل البيانات، ترقيمها، فهرستها، وتتبع الحالة."
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isOngoingIndexingRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/dashboard?module=indexing&mode=ongoing')}
            >
              <span>📊</span>
              سجل التضمين
            </button>

            <button
              type="button"
              title="البحث عن الرسوم النهائية واستخراج النسخ أو النظائر والطباعة."
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isFinalIndexingRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/dashboard?module=indexing&mode=final')}
            >
              <span>🖨️</span>
              استخراج النسخ
            </button>

            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                tab === 'saved'
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => setLocalTab('saved', 'saved')}
            >
              <span>💾</span>
              المراجعة القضائية
            </button>

            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isAuditHubRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/dashboard?module=auditHub')}
            >
              <span>🧭</span>
              مسار المراقبة و التضمين
            </button>

            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isSignedRasmsRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/dashboard?module=signedRasms')}
            >
              <span>✒️</span>
              الرسوم الموقعة
            </button>

            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isSavedDocumentsRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/dashboard?module=savedDocuments')}
            >
              <span>📚</span>
              مكتبة الوثائق المحفوظة
            </button>

            <button
              type="button"
              className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 border-b-4 rounded-t-lg ${
                isSecureArchiveRoute
                  ? 'border-red-950 text-red-950 bg-gradient-to-b from-amber-100/30 to-transparent'
                  : 'border-transparent text-gray-600 hover:text-red-950'
              }`}
              onClick={() => navigate('/secure-archive')}
            >
              <span>🛡️</span>
              الأرشيف العدلي المؤمَّن
            </button>
          </div>

        {tab === 'judicial' && (
          <FeesAgent
            key={`${(loadedDraft as any)?.id || (loadedDraft as any)?._id || 'new'}:${loadedJudgeSubmissionId || 'no-judge'}:${navSelection}`}
            initialState={loadedDraft}
            initialJudgeSubmissionId={loadedJudgeSubmissionId}
            startMode={navSelection === 'drafting' ? 'drafting' : 'intake'}
          />
        )}
        {tab === 'saved' && <SavedDraftsSection onLoad={handleLoadDraft} />}
      </div>
    </ErrorBoundary>
  );
}

// Simple error boundary so the UI shows a readable message instead of a blank area
class ErrorBoundary extends React.Component<{}, { error?: Error | null }> {
  constructor(props: {}) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('Error in FeesModule subtree:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl bg-red-50 p-4 shadow text-sm text-red-900">
          <h3 className="mb-2 text-lg font-semibold">خطأ أثناء تحميل قسم الرسوم</h3>
          <p className="text-xs">حدث خطأ غير متوقع داخل هذا القسم. راجع وحدة التحكم للمزيد من التفاصيل.</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error?.message}</pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}
