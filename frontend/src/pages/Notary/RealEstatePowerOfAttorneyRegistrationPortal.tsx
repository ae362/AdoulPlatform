import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Building2, User, CheckCircle2, AlertTriangle, AlertCircle,
  Plus, Trash2, Printer, Download, Search, ArrowRight, ArrowLeft,
  ShieldCheck, MapPin, FileCheck, Check,
  Send, Eye, Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { printElement } from '../../utils/print';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PartyInfo {
  id: string;
  fullName: string;
  idNumber: string; // CIN or Passport
  birthDate?: string;
  address: string;
}

export type RealEstateDispositionType =
  | 'بيع'
  | 'شراء'
  | 'هبة'
  | 'قسمة'
  | 'رهن'
  | 'إنشاء حق عيني'
  | 'نقل حق عيني'
  | 'تعديل حق عيني'
  | 'إسقاط حق عيني'
  | 'تصرف عقاري آخر';

export type PropertyReferenceType = 'titled' | 'requisition' | 'other';

export type RegistrationRequestStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'processing'
  | 'registered'
  | 'rejected'
  | 'needs_completion';

export interface PowerOfAttorneyRegistrationRequest {
  id: string;
  requestReference: string; // e.g., REQ-2026-REG-000412
  createdAt: string;
  submittedAt?: string;
  status: RegistrationRequestStatus;
  statusNote?: string;

  // 1. Court & Notary Info
  appealCourt: string;
  primaryCourt: string;
  clerkOffice: string;
  applicantNotaryName: string;
  applicantCapacity: string; // 'عدل'
  applicantProfession: string; // 'عدل'
  applicantOffice: string;

  // 2. Power of Attorney Details
  poaDate: string;
  poaDateHijri?: string;
  poaPlace: string;
  poaAttachedFileName?: string;
  poaAttachedFileSize?: string;

  // 3. Parties
  principals: PartyInfo[]; // الموكلون
  agents: PartyInfo[]; // الوكلاء

  // 4. Subject & Real Estate
  dispositionTypes: RealEstateDispositionType[];
  subjectDetails: string;
  propertyRegion: string;
  propertyProvince: string;
  propertyCommune: string;
  propertyAddress: string;
  propertyReferenceType: PropertyReferenceType;
  propertyTitleNumber?: string;
  propertyTitleIndex?: string; // الرمز العقاري مثلاً س/04
  propertyRequisitionNumber?: string;
  propertyDescription?: string;

  // 5. Verification & Compliance
  complianceDeclaration: boolean;
  notes?: string;

  // Official Registration Data (from court clerk when approved)
  clerkRegistrationNumber?: string;
  clerkRegistrationDate?: string;
  clerkRegistryVolume?: string;
  clerkRegistryPage?: string;
}

// ============================================================================
// Moroccan Courts Reference Data
// ============================================================================

export const MOROCCAN_APPEAL_COURTS: Record<string, string[]> = {
  'محكمة الاستئناف بتطوان': [
    'المحكمة الابتدائية بتطوان',
    'المحكمة الابتدائية بشفشاون',
    'المحكمة الابتدائية بالعرائش',
    'المحكمة الابتدائية بوزان',
    'المحكمة الابتدائية بأصيلة'
  ],
  'محكمة الاستئناف بطنجة': [
    'المحكمة الابتدائية بطنجة',
    'المحكمة الابتدائية بالعرائش',
    'المحكمة الابتدائية بأصيلة'
  ],
  'محكمة الاستئناف بالرباط': [
    'المحكمة الابتدائية بالرباط',
    'المحكمة الابتدائية بسلا',
    'المحكمة الابتدائية بتمارة',
    'المحكمة الابتدائية بالخميسات',
    'المحكمة الابتدائية بالرماني'
  ],
  'محكمة الاستئناف بالدار البيضاء': [
    'المحكمة الابتدائية المدنية بالدار البيضاء',
    'المحكمة الابتدائية الزجرية بالدار البيضاء',
    'المحكمة الابتدائية بالمحمدية',
    'المحكمة الابتدائية ببنسليمان'
  ],
  'محكمة الاستئناف بفاس': [
    'المحكمة الابتدائية بفاس',
    'المحكمة الابتدائية بصفرو',
    'المحكمة الابتدائية ببولمان'
  ],
  'محكمة الاستئناف بمراكش': [
    'المحكمة الابتدائية بمراكش',
    'المحكمة الابتدائية بإمنتانوت',
    'المحكمة الابتدائية بقلعة السراغنة',
    'المحكمة الابتدائية بابن جرير'
  ],
  'محكمة الاستئناف بأكادير': [
    'المحكمة الابتدائية بأكادير',
    'المحكمة الابتدائية بإنزكان',
    'المحكمة الابتدائية بتارودانت',
    'المحكمة الابتدائية بتيزنيت'
  ],
  'محكمة الاستئناف بوجدة': [
    'المحكمة الابتدائية بوجدة',
    'المحكمة الابتدائية ببركان',
    'المحكمة الابتدائية بتاوريرت',
    'المحكمة الابتدائية بجرسيف'
  ]
};

export const MOROCCAN_REGIONS = [
  'طنجة - تطوان - الحسيمة',
  'الرباط - سلا - القنيطرة',
  'الدار البيضاء - سطات',
  'فاس - مكناس',
  'مراكش - آسفي',
  'سوس - ماسة',
  'الشرق',
  'بني ملال - خنيفرة',
  'درعة - تافيلالت',
  'كلميم - واد نون',
  'العيون - الساقية الحمراء',
  'الداخلة - وادي الذهب'
];

export const DISPOSITION_OPTIONS: RealEstateDispositionType[] = [
  'بيع',
  'شراء',
  'هبة',
  'قسمة',
  'رهن',
  'إنشاء حق عيني',
  'نقل حق عيني',
  'تعديل حق عيني',
  'إسقاط حق عيني',
  'تصرف عقاري آخر'
];

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateRef = () => `REQ-2026-REG-${Math.floor(100000 + Math.random() * 900000)}`;

// ============================================================================
// Main Component
// ============================================================================

export const RealEstatePowerOfAttorneyRegistrationPortal: React.FC = () => {
  const { user, notaryProfile } = useAuth();

  // Active view tab: 'new_request' | 'requests_archive' | 'form_preview'
  const [activeTab, setActiveTab] = useState<'new_request' | 'requests_archive' | 'form_preview'>('new_request');

  // Wizard active step (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Search and filter for archive
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveFilterStatus, setArchiveFilterStatus] = useState<string>('all');

  // PDF Exporting State
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Real QR Code Data URL State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Notary defaults from profile
  const userPrimaryCourt = notaryProfile?.primary_court || user?.court_name || '';
  const userAppealCourt = notaryProfile?.appellate_court || '';
  const userFullName = user?.full_name || (notaryProfile as any)?.full_name_ar || 'الأستاذ العدل';
  const userOffice = notaryProfile?.office_address || (notaryProfile?.primary_court ? `مكتب التوثيق بدائرة ${notaryProfile.primary_court}` : 'مكتب التوثيق العدلي');

  // Find matching default appeal court
  const initialAppealCourt = useMemo(() => {
    if (userAppealCourt && MOROCCAN_APPEAL_COURTS[userAppealCourt]) return userAppealCourt;
    // Check if primary court is under an appeal court
    if (userPrimaryCourt) {
      for (const [appeal, primaries] of Object.entries(MOROCCAN_APPEAL_COURTS)) {
        if (primaries.some(p => p.includes(userPrimaryCourt) || userPrimaryCourt.includes(p))) {
          return appeal;
        }
      }
    }
    return 'محكمة الاستئناف بتطوان';
  }, [userAppealCourt, userPrimaryCourt]);

  const initialPrimaryCourt = useMemo(() => {
    if (userPrimaryCourt) return userPrimaryCourt;
    return MOROCCAN_APPEAL_COURTS[initialAppealCourt]?.[0] || 'المحكمة الابتدائية بتطوان';
  }, [userPrimaryCourt, initialAppealCourt]);

  // Form State
  const [formData, setFormData] = useState<PowerOfAttorneyRegistrationRequest>({
    id: generateId(),
    requestReference: generateRef(),
    createdAt: new Date().toISOString().split('T')[0],
    status: 'draft',

    // Stage 1
    appealCourt: initialAppealCourt,
    primaryCourt: initialPrimaryCourt,
    clerkOffice: 'مصلحة كتابة الضبط - مكتب السجل المحلي للوكالات العقارية',
    applicantNotaryName: userFullName,
    applicantCapacity: 'عدل ممارس',
    applicantProfession: 'خطة العدالة',
    applicantOffice: userOffice,

    // Stage 2
    poaDate: new Date().toISOString().split('T')[0],
    poaDateHijri: '1447 هـ',
    poaPlace: 'تطوان',
    poaAttachedFileName: '',
    poaAttachedFileSize: '',
    principals: [
      { id: generateId(), fullName: '', idNumber: '', birthDate: '', address: '' }
    ],
    agents: [
      { id: generateId(), fullName: '', idNumber: '', birthDate: '', address: '' }
    ],

    // Stage 3
    dispositionTypes: ['بيع'],
    subjectDetails: '',
    propertyRegion: 'طنجة - تطوان - الحسيمة',
    propertyProvince: 'تطوان',
    propertyCommune: 'تطوان',
    propertyAddress: '',
    propertyReferenceType: 'titled',
    propertyTitleNumber: '',
    propertyTitleIndex: '04',
    propertyRequisitionNumber: '',
    propertyDescription: '',

    // Stage 4
    complianceDeclaration: false,
    notes: ''
  });

  // Sync with notaryProfile once loaded
  useEffect(() => {
    if (notaryProfile || user) {
      setFormData(prev => {
        const detectedAppeal = userAppealCourt || prev.appealCourt || 'محكمة الاستئناف بتطوان';
        const detectedPrimary = userPrimaryCourt || prev.primaryCourt || 'المحكمة الابتدائية بتطوان';
        const detectedName = user?.full_name || (notaryProfile as any)?.full_name_ar || prev.applicantNotaryName;
        const detectedOffice = notaryProfile?.office_address || (notaryProfile?.primary_court ? `مكتب التوثيق بدائرة ${notaryProfile.primary_court}` : prev.applicantOffice);

        return {
          ...prev,
          appealCourt: detectedAppeal,
          primaryCourt: detectedPrimary,
          applicantNotaryName: detectedName,
          applicantOffice: detectedOffice
        };
      });
    }
  }, [notaryProfile, user, userAppealCourt, userPrimaryCourt]);

  // Selected request for preview/detail
  const [selectedRequest, setSelectedRequest] = useState<PowerOfAttorneyRegistrationRequest>(formData);

  // Generate authentic real QR Code as base64 PNG data URL (renders flawlessly in both browser and html2canvas)
  useEffect(() => {
    if (!selectedRequest?.requestReference) return;
    const qrPayload = `المملكة المغربية - وزارة العدل\nطلب تقييد وكالة في السجل المحلي للوكالات المتعلقة بالحقوق العينية\nالمرجع: ${selectedRequest.requestReference}\nالمحكمة: ${selectedRequest.primaryCourt}\nمحرر الوكالة: ${selectedRequest.applicantNotaryName}\nالتاريخ: ${selectedRequest.createdAt}\nالتحقق: https://adoul.ma/verify/poa-reg?ref=${selectedRequest.requestReference}`;

    QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate QR code data URL:', err));
  }, [selectedRequest.requestReference, selectedRequest.primaryCourt, selectedRequest.applicantNotaryName, selectedRequest.createdAt]);

  // Mock Requests Archive
  const [requestsArchive, setRequestsArchive] = useState<PowerOfAttorneyRegistrationRequest[]>([
    {
      id: 'poa-req-001',
      requestReference: 'REQ-2026-REG-781067',
      createdAt: '2026-06-02',
      submittedAt: '2026-06-02',
      status: 'registered',
      statusNote: 'تم تقييد الوكالة بالسجل المحلي بنجاح، وتسليم شهادة التقييد',
      appealCourt: 'محكمة الاستئناف بتطوان',
      primaryCourt: 'المحكمة الابتدائية بتطوان',
      clerkOffice: 'مصلحة كتابة الضبط - مكتب السجل المحلي للوكالات العقارية',
      applicantNotaryName: 'ذ. عبد الكريم العلمي',
      applicantCapacity: 'عدل ممارس',
      applicantProfession: 'خطة العدالة',
      applicantOffice: 'مكتب التوثيق العدلي - شارع محمد الخامس، تطوان',
      poaDate: '2026-06-01',
      poaDateHijri: '15 ذو الحجة 1447',
      poaPlace: 'تطوان',
      poaAttachedFileName: 'وكالة_رسمية_مفصلة_بيع_عقار.pdf',
      poaAttachedFileSize: '2.4 MB',
      principals: [
        { id: 'p1', fullName: 'محمد بن التهامي اليعقوبي', idNumber: 'L348912', birthDate: '1975-04-12', address: 'حي الولاية، عمارة 14، تطوان' }
      ],
      agents: [
        { id: 'a1', fullName: 'رشيد اليعقوبي', idNumber: 'L552190', birthDate: '1982-08-20', address: 'شارع الجيش الملكي، تطوان' }
      ],
      dispositionTypes: ['بيع', 'شراء'],
      subjectDetails: 'توكيل مفصل لبيع العقار ذي الرسم العقاري عدد 19842/04 وقبض الثمن وإبرام العقود لدى العدول والمحافظة العقارية',
      propertyRegion: 'طنجة - تطوان - الحسيمة',
      propertyProvince: 'تطوان',
      propertyCommune: 'تطوان',
      propertyAddress: 'حي المطار، زنقة النخيل، رقم 45',
      propertyReferenceType: 'titled',
      propertyTitleNumber: '19842',
      propertyTitleIndex: '04',
      complianceDeclaration: true,
      clerkRegistrationNumber: 'REG-TT-2026/00142',
      clerkRegistrationDate: '2026-06-03',
      clerkRegistryVolume: '03',
      clerkRegistryPage: '88'
    },
    {
      id: 'poa-req-002',
      requestReference: 'REQ-2026-REG-892144',
      createdAt: '2026-06-15',
      submittedAt: '2026-06-15',
      status: 'processing',
      statusNote: 'الطلب قيد المراجعة والتحقق من طرف رئيس كتابة الضبط',
      appealCourt: 'محكمة الاستئناف بتطوان',
      primaryCourt: 'المحكمة الابتدائية بشفشاون',
      clerkOffice: 'مصلحة كتابة الضبط',
      applicantNotaryName: 'ذ. عبد الكريم العلمي',
      applicantCapacity: 'عدل ممارس',
      applicantProfession: 'خطة العدالة',
      applicantOffice: 'مكتب التوثيق العدلي - تطوان',
      poaDate: '2026-06-14',
      poaPlace: 'شفشاون',
      poaAttachedFileName: 'رسم_وكالة_قسمة_عقارية.pdf',
      principals: [
        { id: 'p2', fullName: 'فاطمة الزهراء العمراني', idNumber: 'GM44102', address: 'حي العيون، شفشاون' }
      ],
      agents: [
        { id: 'a2', fullName: 'حمزة العمراني', idNumber: 'GM98201', address: 'ساحة وطاء الحمام، شفشاون' }
      ],
      dispositionTypes: ['قسمة', 'إنشاء حق عيني'],
      subjectDetails: 'وكالة عقارية لإجراء قسمة رضائية في العقار الموروث وتوقيع الرسوم العدلية',
      propertyRegion: 'طنجة - تطوان - الحسيمة',
      propertyProvince: 'شفشاون',
      propertyCommune: 'باب تازة',
      propertyAddress: 'دوار تاسيفت، جماعة باب تازة',
      propertyReferenceType: 'requisition',
      propertyRequisitionNumber: '44521/19',
      complianceDeclaration: true
    }
  ]);

  // Primary Courts list based on chosen appeal court
  const availablePrimaryCourts = useMemo(() => {
    return MOROCCAN_APPEAL_COURTS[formData.appealCourt] || [formData.primaryCourt];
  }, [formData.appealCourt, formData.primaryCourt]);

  // Handle Principal modifications
  const addPrincipal = () => {
    setFormData(prev => ({
      ...prev,
      principals: [
        ...prev.principals,
        { id: generateId(), fullName: '', idNumber: '', birthDate: '', address: '' }
      ]
    }));
  };

  const removePrincipal = (id: string) => {
    if (formData.principals.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      principals: prev.principals.filter(p => p.id !== id)
    }));
  };

  const updatePrincipal = (id: string, field: keyof PartyInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      principals: prev.principals.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  // Handle Agent modifications
  const addAgent = () => {
    setFormData(prev => ({
      ...prev,
      agents: [
        ...prev.agents,
        { id: generateId(), fullName: '', idNumber: '', birthDate: '', address: '' }
      ]
    }));
  };

  const removeAgent = (id: string) => {
    if (formData.agents.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      agents: prev.agents.filter(a => a.id !== id)
    }));
  };

  const updateAgent = (id: string, field: keyof PartyInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  // Toggle disposition type
  const toggleDisposition = (type: RealEstateDispositionType) => {
    setFormData(prev => {
      const exists = prev.dispositionTypes.includes(type);
      return {
        ...prev,
        dispositionTypes: exists
          ? prev.dispositionTypes.filter(t => t !== type)
          : [...prev.dispositionTypes, type]
      };
    });
  };

  // Smart Legal Audit Checklist (12 Points)
  const auditChecks = useMemo(() => {
    const pCount = formData.principals.filter(p => p.fullName.trim() && p.idNumber.trim()).length;
    const aCount = formData.agents.filter(a => a.fullName.trim() && a.idNumber.trim()).length;
    const hasPropertyRef = formData.propertyReferenceType === 'titled'
      ? !!formData.propertyTitleNumber?.trim()
      : formData.propertyReferenceType === 'requisition'
        ? !!formData.propertyRequisitionNumber?.trim()
        : !!formData.propertyDescription?.trim();

    return [
      { id: 1, title: 'تحديد المحكمة الابتدائية المختصة عقارياً', valid: !!formData.primaryCourt, targetField: 'field-primary-court', step: 1 },
      { id: 2, title: 'صفة محرر الوكالة (عدل ممارس بالنفوذ)', valid: !!formData.applicantNotaryName, targetField: 'field-applicant-name', step: 1 },
      { id: 3, title: 'إدخال تاريخ تحرير الوكالة', valid: !!formData.poaDate, targetField: 'field-poa-date', step: 2 },
      { id: 4, title: 'إدخال مكان تحرير الوكالة', valid: !!formData.poaPlace.trim(), targetField: 'field-poa-place', step: 2 },
      { id: 5, title: 'إرفاق نظير أو نسخة إلكترونية مصادق عليها للوكالة', valid: !!formData.poaAttachedFileName, targetField: 'field-poa-attachment', step: 2 },
      { id: 6, title: 'اكتمال بيانات الموكل أو الموكلين (الاسم وبطاقة التعريف)', valid: pCount === formData.principals.length && pCount > 0, targetField: 'field-principal-0', step: 2 },
      { id: 7, title: 'اكتمال بيانات الوكيل أو الوكلاء (الاسم وبطاقة التعريف)', valid: aCount === formData.agents.length && aCount > 0, targetField: 'field-agent-0', step: 2 },
      { id: 8, title: 'تحديد نوع التصرف العقاري (بيع، قسمة، رهن...) من الخيارات المعتمدة', valid: formData.dispositionTypes.length > 0, targetField: 'field-disposition-types', step: 3 },
      { id: 9, title: 'تفصيل موضوع الوكالة والصلاحيات المخولة بدقة', valid: formData.subjectDetails.trim().length >= 10, targetField: 'field-subject-details', step: 3 },
      { id: 10, title: 'تحديد موقع العقار (الجهة، الإقليم، الجماعة)', valid: !!formData.propertyRegion && !!formData.propertyProvince.trim(), targetField: 'field-property-province', step: 3 },
      { id: 11, title: 'إدراج المرجع العقاري (رقم الرسم العقاري أو مطلب التحفيظ)', valid: hasPropertyRef, targetField: 'field-property-reference', step: 3 },
      { id: 12, title: 'تأكيد الإقرار بصحة البيانات ومطابقتها للأصل', valid: formData.complianceDeclaration, targetField: 'field-compliance-declaration', step: 4 }
    ];
  }, [formData]);

  const auditPassedCount = auditChecks.filter(c => c.valid).length;
  const isAuditComplete = auditPassedCount === auditChecks.length;

  // Direct navigation from audit card to missing field
  const navigateToMissingField = (checkId: number) => {
    const item = auditChecks.find(c => c.id === checkId);
    if (!item) return;

    setCurrentStep(item.step);

    setTimeout(() => {
      const el = document.getElementById(item.targetField);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('ring-4', 'ring-emerald-500', 'bg-emerald-50/70', 'transition-all', 'duration-300');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-emerald-500', 'bg-emerald-50/70');
        }, 2200);
      }
    }, 150);
  };

  // Handle save as draft
  const handleSaveDraft = () => {
    const updated: PowerOfAttorneyRegistrationRequest = {
      ...formData,
      status: 'draft',
      statusNote: 'تم حفظ مسودة الطلب محلياً بنجاح'
    };
    setRequestsArchive(prev => [updated, ...prev.filter(r => r.id !== updated.id)]);
    alert('تم حفظ المسودة بنجاح في أرشيف الطلبات.');
  };

  // Handle final submission to court clerk
  const handleSubmitRequest = () => {
    if (!isAuditComplete) {
      alert('يرجى استكمال جميع بنود التدقيق والمراجعة القانونية قبل إرسال الطلب لكتابة الضبط.');
      return;
    }

    const updated: PowerOfAttorneyRegistrationRequest = {
      ...formData,
      status: 'submitted',
      submittedAt: new Date().toISOString().split('T')[0],
      statusNote: 'تم إيداع الطلب رسمياً لدى كتابة الضبط بالمحكمة الابتدائية المختصة'
    };

    setRequestsArchive(prev => [updated, ...prev.filter(r => r.id !== updated.id)]);
    setSelectedRequest(updated);
    setActiveTab('form_preview');
    alert('تم إرسال طلب التقييد بنجاح! تم إنشاء النموذج الرسمي رقم 1 وجاهز للمعاينة والطباعة.');
  };

  // Filtered Archive
  const filteredArchive = useMemo(() => {
    return requestsArchive.filter(req => {
      const matchSearch =
        req.requestReference.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        req.principals.some(p => p.fullName.includes(archiveSearch)) ||
        req.agents.some(a => a.fullName.includes(archiveSearch)) ||
        req.primaryCourt.includes(archiveSearch);

      const matchStatus = archiveFilterStatus === 'all' || req.status === archiveFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [requestsArchive, archiveSearch, archiveFilterStatus]);

  // Native High-Precision Print & Save-to-PDF Dialog
  const handlePrint = () => {
    const element = document.getElementById('official-poa-form-1');
    if (element) {
      printElement(element, {
        title: `طلب_تقييد_وكالة_عقارية_${selectedRequest.requestReference}`,
        extraCss: `
          body { font-family: 'Amiri', 'Traditional Arabic', 'Cairo', Arial, sans-serif !important; direction: rtl; }
          #official-poa-form-1 { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 15mm !important; }
        `
      });
    } else {
      window.print();
    }
  };

  // Direct File Download PDF with High-Precision Arabic Typography & Word Spacing Protection
  const handleDownloadPdf = async () => {
    const element = document.getElementById('official-poa-form-1');
    if (!element) return;
    setIsExportingPdf(true);

    try {
      // Use html2canvas with root zoom reset to prevent subpixel bounding box truncation on RTL text
      const canvas = await html2canvas(element, {
        scale: 2.2, // 300 DPI high-definition print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Reset root zoom (index.css sets zoom: 90% which breaks Range.getClientRects in RTL)
          clonedDoc.documentElement.style.zoom = '1';
          clonedDoc.documentElement.style.fontSize = '14px';
          clonedDoc.body.style.zoom = '1';

          const el = clonedDoc.getElementById('official-poa-form-1');
          if (el) {
            el.style.fontFamily = "'Amiri', 'Cairo', 'Traditional Arabic', Arial, sans-serif";
            el.style.letterSpacing = 'normal';
            el.style.wordSpacing = 'normal';
            el.style.boxShadow = 'none';
            el.style.border = 'none';
            el.style.margin = '0 auto';
            el.style.width = '780px';
            el.style.maxWidth = '780px';
            el.style.padding = '30px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()), undefined, 'FAST');
      pdf.save(`طلب_تقييد_وكالة_عقارية_النموذج_1_${selectedRequest.requestReference}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback seamlessly to native print dialog
      handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 font-kufi" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-800 text-white rounded-2xl p-5 md:p-7 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1 shadow-lg shrink-0">
              <img
                src="/logos/adoul-logo.jpg"
                alt="شعار الهيئة الوطنية للعدول بالمغرب"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  🏛️ طلبات كتابة الضبط
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  ساري المفعول ابتداءً من 1 يونيو 2026
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white mt-1">
                تقييد وكالة في السجل المحلي للوكالات المتعلقة بالحقوق العينية
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1">
                وفقاً للنموذج رقم 1 من قرار وزير العدل رقم 381.25 والمرسوم رقم 2.23.101 (تطبيقاً للفصل 889-1 من ق.ل.ع)
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-white/10 shrink-0 self-stretch md:self-auto justify-center">
            <button
              onClick={() => setActiveTab('new_request')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'new_request'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>طلب جديد</span>
            </button>
            <button
              onClick={() => setActiveTab('requests_archive')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'requests_archive'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>سجل الطلبات ({requestsArchive.length})</span>
            </button>
            <button
              onClick={() => {
                setSelectedRequest(formData);
                setActiveTab('form_preview');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'form_preview'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>النموذج الرسمي رقم 1</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: NEW REQUEST WIZARD */}
      {/* ========================================================================= */}
      {activeTab === 'new_request' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { step: 1, title: 'المرحلة ①: بيانات الطلب والمحكمة', icon: Building2 },
                { step: 2, title: 'المرحلة ②: بطاقة الوكالة والأطراف', icon: User },
                { step: 3, title: 'المرحلة ③: موضوع الوكالة والعقار', icon: MapPin },
                { step: 4, title: 'المرحلة ④: التدقيق والإقرار والإرسال', icon: ShieldCheck }
              ].map(s => {
                const Icon = s.icon;
                const isActive = currentStep === s.step;
                const isPassed = currentStep > s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-right transition ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-black shadow-sm'
                        : isPassed
                          ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800'
                          : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : isPassed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{s.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {s.step === 1 && 'المحكمة وصاحب الطلب'}
                        {s.step === 2 && 'الموكلون والوكلاء والمرفق'}
                        {s.step === 3 && 'نوع التصرف وموقع العقار'}
                        {s.step === 4 && '12 فحصاً آلياً والنموذج'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: Court & Applicant Notary */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>المرحلة ① — بيانات المحكمة المختصة وصاحب الطلب</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد المحكمة الابتدائية التي يقع بدائرتها العقار أو مكتب التوثيق، والتعبئة الآلية لبيانات العدل من الحساب المهني.
                </p>
              </div>

              {/* Courts selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    محكمة الاستئناف
                  </label>
                  <select
                    id="field-appeal-court"
                    value={formData.appealCourt}
                    onChange={(e) => {
                      const newAppeal = e.target.value;
                      const primaries = MOROCCAN_APPEAL_COURTS[newAppeal] || [];
                      setFormData(prev => ({
                        ...prev,
                        appealCourt: newAppeal,
                        primaryCourt: primaries[0] || ''
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  >
                    {Object.keys(MOROCCAN_APPEAL_COURTS).map(court => (
                      <option key={court} value={court}>{court}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المحكمة الابتدائية (محل إيداع الطلب)
                  </label>
                  <select
                    id="field-primary-court"
                    value={formData.primaryCourt}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryCourt: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  >
                    {availablePrimaryCourts.map(court => (
                      <option key={court} value={court}>
                        {court} {court === userPrimaryCourt ? '📍 (محكمتك الأصلية)' : ''}
                      </option>
                    ))}
                  </select>
                  {userPrimaryCourt && (
                    <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                      ✓ تم استرجاع المحكمة الابتدائية المسجلة بملفك المهني: {userPrimaryCourt}
                    </p>
                  )}
                </div>
              </div>

              {/* Applicant Notary Info (Auto-filled) */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>صاحب الطلب (العدل محرر الوكالة — معبأة آلياً)</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    حساب مفعل
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الاسم الشخصي والعائلي
                    </label>
                    <input
                      id="field-applicant-name"
                      type="text"
                      value={formData.applicantNotaryName}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicantNotaryName: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الصفة / المهنة
                    </label>
                    <input
                      type="text"
                      value={formData.applicantCapacity}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      المكتب / دائرة الانتصاب
                    </label>
                    <input
                      id="field-applicant-office"
                      type="text"
                      value={formData.applicantOffice}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicantOffice: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                  💡 طبقاً للمرسوم رقم 2.23.101، يقدم طلب التقييد في السجل المحلي للوكالات المتعلقة بالحقوق العينية من طرف محرر الوكالة (العدل أو الموثق أو المحامي المقبول لدى النقض).
                </p>
              </div>

              {/* Navigation button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <span>المتابعة إلى بطاقة الوكالة والأطراف</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Power of Attorney & Parties */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>المرحلة ② — بطاقة الوكالة والأطراف (الموكلون والوكلاء)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد تاريخ ومكان تحرير الوكالة، إرفاق النسخة الرقمية، وإضافة الموكلين والوكلاء (إمكانية إضافة أكثر من موكل ووكيل).
                </p>
              </div>

              {/* POA Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاريخ الوكالة (ميلادي)
                  </label>
                  <input
                    id="field-poa-date"
                    type="date"
                    value={formData.poaDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, poaDate: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاريخ الوكالة (هجري - اختياري)
                  </label>
                  <input
                    id="field-poa-date-hijri"
                    type="text"
                    placeholder="مثال: 15 ذو القعدة 1447"
                    value={formData.poaDateHijri || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, poaDateHijri: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    مكان تحرير الوكالة
                  </label>
                  <input
                    id="field-poa-place"
                    type="text"
                    placeholder="مثال: تطوان"
                    value={formData.poaPlace}
                    onChange={(e) => setFormData(prev => ({ ...prev, poaPlace: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* File Attachment Check */}
              <div id="field-poa-attachment" className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-700" />
                      <span>إرفاق نسخة أو نظير الوكالة الرسمية (إلزامي طبقا للمرسوم 2.23.101)</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      يجب إرفاق نظير الوكالة أو نسخة مصادق عليها إلكترونياً بصيغة PDF.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {formData.poaAttachedFileName ? (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-300">
                        <span className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">
                          📎 {formData.poaAttachedFileName}
                        </span>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, poaAttachedFileName: '', poaAttachedFileSize: '' }))}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black transition flex items-center gap-2 shadow-sm">
                        <span>📎 إرفاق نسخة الوكالة PDF</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData(prev => ({
                                ...prev,
                                poaAttachedFileName: file.name,
                                poaAttachedFileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                              }));
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Principals (الموكلون) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>بيانات الموكل (أو الموكلين)</span>
                  </h3>
                  <button
                    onClick={addPrincipal}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة موكل آخر</span>
                  </button>
                </div>

                {formData.principals.map((principal, idx) => (
                  <div key={principal.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded">
                        الموكل {idx + 1}
                      </span>
                      {formData.principals.length > 1 && (
                        <button
                          onClick={() => removePrincipal(principal.id)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الشخصي والعائلي</label>
                        <input
                          id={`field-principal-${idx}`}
                          type="text"
                          placeholder="الاسم الكامل كما في وثيقة الهوية"
                          value={principal.fullName}
                          onChange={(e) => updatePrincipal(principal.id, 'fullName', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم وثيقة التعريف (CIN)</label>
                        <input
                          type="text"
                          placeholder="مثال: L123456"
                          value={principal.idNumber}
                          onChange={(e) => updatePrincipal(principal.id, 'idNumber', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الازدياد</label>
                        <input
                          type="date"
                          value={principal.birthDate || ''}
                          onChange={(e) => updatePrincipal(principal.id, 'birthDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">العنوان الكامل ومحل الإقامة</label>
                      <input
                        type="text"
                        placeholder="العنوان الكامل للموكل"
                        value={principal.address}
                        onChange={(e) => updatePrincipal(principal.id, 'address', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Agents (الوكلاء) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>بيانات الوكيل (أو الوكلاء)</span>
                  </h3>
                  <button
                    onClick={addAgent}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة وكيل آخر</span>
                  </button>
                </div>

                {formData.agents.map((agent, idx) => (
                  <div key={agent.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded">
                        الوكيل {idx + 1}
                      </span>
                      {formData.agents.length > 1 && (
                        <button
                          onClick={() => removeAgent(agent.id)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الشخصي والعائلي</label>
                        <input
                          id={`field-agent-${idx}`}
                          type="text"
                          placeholder="الاسم الكامل للوكيل"
                          value={agent.fullName}
                          onChange={(e) => updateAgent(agent.id, 'fullName', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم وثيقة التعريف (CIN)</label>
                        <input
                          type="text"
                          placeholder="مثال: L654321"
                          value={agent.idNumber}
                          onChange={(e) => updateAgent(agent.id, 'idNumber', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الازدياد</label>
                        <input
                          type="date"
                          value={agent.birthDate || ''}
                          onChange={(e) => updateAgent(agent.id, 'birthDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">العنوان الكامل ومحل الإقامة</label>
                      <input
                        type="text"
                        placeholder="العنوان الكامل للوكيل"
                        value={agent.address}
                        onChange={(e) => updateAgent(agent.id, 'address', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للمرحلة السابقة</span>
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <span>المتابعة إلى موضوع الوكالة والعقار</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Subject & Real Estate */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span>المرحلة ③ — موضوع الوكالة والتصرفات وبيانات العقار</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد نوع التصرفات المخولة بالوكالة، تفصيل موضوعها، وتحديد موقع العقار والمرجع العقاري (الرسم العقاري أو مطلب التحفيظ).
                </p>
              </div>

              {/* Disposition Types Selection */}
              <div id="field-disposition-types" className="space-y-2">
                <label className="block text-xs font-black text-slate-900">
                  نوع التصرف العقاري المخول في الوكالة (يمكن اختيار أكثر من نوع):
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {DISPOSITION_OPTIONS.map(type => {
                    const isChecked = formData.dispositionTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleDisposition(type)}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{type}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Subject */}
              <div id="field-subject-details">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-900">
                    موضوع الوكالة بالتفصيل وصلاحيات الوكيل:
                  </label>
                  <span className={`text-[10px] font-bold ${formData.subjectDetails.trim().length >= 10 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formData.subjectDetails.trim().length >= 10 ? '✓ مكتمل ومستوفٍ' : '(الحد الأدنى 10 أحرف)'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={formData.subjectDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, subjectDetails: e.target.value }))}
                  placeholder="بيان دقيق للصلاحيات المخولة للوكيل (مثال: توكيل عام لبيع الشقة السكنية وقبض الثمن وإبراء الذمة وتوقيع العقد النهائي...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-600 outline-none transition"
                />
              </div>

              {/* Property Location */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>موقع العقار محل الوكالة</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الجهة</label>
                    <select
                      id="field-property-region"
                      value={formData.propertyRegion}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyRegion: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      {MOROCCAN_REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">العمالة / الإقليم</label>
                    <input
                      id="field-property-province"
                      type="text"
                      placeholder="مثال: إقليم تطوان"
                      value={formData.propertyProvince}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyProvince: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الجماعة / الدائرة</label>
                    <input
                      id="field-property-commune"
                      type="text"
                      placeholder="مثال: جماعة تطوان"
                      value={formData.propertyCommune}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyCommune: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">العنوان التفصيلي وموقع العقار</label>
                  <input
                    id="field-property-address"
                    type="text"
                    placeholder="مثال: شارع عبد الخالق الطريس، إقامة الأندلس، الشقة 12، تطوان"
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Property Reference (Titled vs Requisition) */}
              <div id="field-property-reference" className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>المرجع العقاري (الرسم العقاري / مطلب التحفيظ)</span>
                </h3>

                <div className="flex items-center gap-4">
                  {[
                    { id: 'titled', label: 'عقار محفظ (رسم عقاري)' },
                    { id: 'requisition', label: 'في طور التحفيظ (مطلب تحفيظ)' },
                    { id: 'other', label: 'عقار غير محفظ أو وضعية أخرى' }
                  ].map(ref => (
                    <label key={ref.id} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="refType"
                        checked={formData.propertyReferenceType === ref.id}
                        onChange={() => setFormData(prev => ({ ...prev, propertyReferenceType: ref.id as any }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{ref.label}</span>
                    </label>
                  ))}
                </div>

                {formData.propertyReferenceType === 'titled' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الرسم العقاري</label>
                      <input
                        id="field-title-number"
                        type="text"
                        placeholder="مثال: 19842"
                        value={formData.propertyTitleNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, propertyTitleNumber: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">الرمز العقاري (المؤشر / الرمز)</label>
                      <input
                        id="field-title-index"
                        type="text"
                        placeholder="مثال: 04 أو س/04"
                        value={formData.propertyTitleIndex || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, propertyTitleIndex: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {formData.propertyReferenceType === 'requisition' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم مطلب التحفيظ</label>
                    <input
                      id="field-requisition-number"
                      type="text"
                      placeholder="مثال: 44521/19"
                      value={formData.propertyRequisitionNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyRequisitionNumber: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                )}

                {formData.propertyReferenceType === 'other' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">أوصاف وحدود العقار</label>
                    <textarea
                      id="field-property-description"
                      rows={2}
                      placeholder="حدود وأوصاف العقار أو المرجع التعريفي المعتمد بالوكالة"
                      value={formData.propertyDescription || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyDescription: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لبطاقة الوكالة</span>
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <span>المتابعة إلى التدقيق والإرسال</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Smart Audit & Submission */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Audit Checklist (12 Points) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>المرحلة ④ — التدقيق والمراجعة القانونية الآلية (12 فحصاً)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      التحقق الآلي من توافق الطلب مع مقتضيات الفصل 889-1 من ق.ل.ع وقرار وزير العدل رقم 381.25. (انقر على أي بيان للانتقال فوراً لتعبئته).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">النتيجة:</span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded ${
                        isAuditComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {auditPassedCount} من 12
                    </span>
                  </div>
                </div>

                {/* 12 Interactive Check Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditChecks.map(check => (
                    <button
                      key={check.id}
                      type="button"
                      onClick={() => navigateToMissingField(check.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer text-right group ${
                        check.valid
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-bold hover:bg-emerald-100/80 shadow-xs'
                          : 'bg-red-50/90 border-red-300 text-red-950 font-black hover:bg-red-100 shadow-sm ring-2 ring-red-400/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] text-slate-400 font-bold">#{check.id}</span>
                        <span className="truncate">{check.title}</span>
                        {!check.valid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-black animate-pulse flex items-center gap-1 shrink-0">
                            انقر للإكمال 👈
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 mr-2">
                        {check.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Legal Warning Notice */}
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-950">
                      تنبيه قانوني هام بمقتضى الفصل 889-1 من ظهير الالتزامات والعقود:
                    </h4>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      يجب أن تقيد الوكالات المتعلقة بنقل الملكية أو بإنشاء الحقوق العينية الأخرى أو نقلها أو تعديلها أو إسقاطها في السجل المحلي الممسوك بكتابة ضبط المحكمة الابتدائية المختصة داخل أجل محدد، ولا يعتد بها في مواجهة الغير إلا من تاريخ هذا التقييد.
                    </p>
                  </div>
                </div>

                {/* Compliance Declaration Checkbox */}
                <div id="field-compliance-declaration" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.complianceDeclaration}
                      onChange={(e) => setFormData(prev => ({ ...prev, complianceDeclaration: e.target.checked }))}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-900 block">
                        إقرار بصحة البيانات ومطابقة المرفقات للأصل الرسمي للوكالة
                      </span>
                      <span className="text-[11px] text-slate-600 block leading-relaxed">
                        أشهد أنا العدل الموقع أسفله بصحة البيانات الواردة بهذا الطلب وبأن نسخة الوكالة المرفقة مطابقة للرسم العدلي المضمن، وأتحمل كامل المسؤولية القانونية والمهنية عن ذلك.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>العودة لموضوع الوكالة</span>
                  </button>

                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <button
                      onClick={handleSaveDraft}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                    >
                      حفظ كمسودة
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(formData);
                        setActiveTab('form_preview');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-4 h-4" />
                      <span>معاينة النموذج 1</span>
                    </button>
                    <button
                      onClick={handleSubmitRequest}
                      disabled={!isAuditComplete}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition ${
                        isAuditComplete
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>إرسال وإيداع الطلب رسمياً</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REQUESTS ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'requests_archive' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>سجل وأرشيف طلبات تقييد الوكالات العقارية</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تتبع مسار الطلبات المودعة لدى كتابة الضبط، وأرقام التقييد في السجل المحلي، وسحب النماذج الرسمية.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث برقم الطلب، الموكل، الوكيل..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-800 w-64 outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>

              <select
                value={archiveFilterStatus}
                onChange={(e) => setArchiveFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="draft">مسودة</option>
                <option value="submitted">تم الإيداع</option>
                <option value="processing">قيد المعالجة</option>
                <option value="registered">تم التقييد بالسجل</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">رقم الطلب المرجعي</th>
                  <th className="p-3">المحكمة الابتدائية</th>
                  <th className="p-3">الموكل</th>
                  <th className="p-3">الوكيل</th>
                  <th className="p-3">نوع التصرف والعقار</th>
                  <th className="p-3">الحالة والمسار</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArchive.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد طلبات مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredArchive.map(req => {
                    const statusBadge = {
                      draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-700' },
                      ready: { label: 'جاهز للإرسال', color: 'bg-blue-100 text-blue-700' },
                      submitted: { label: 'تم الإيداع', color: 'bg-amber-100 text-amber-800' },
                      processing: { label: 'قيد المعالجة بكتابة الضبط', color: 'bg-purple-100 text-purple-800' },
                      registered: { label: 'تم التقييد بالسجل', color: 'bg-emerald-100 text-emerald-800' },
                      rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
                      needs_completion: { label: 'يحتاج استكمال', color: 'bg-orange-100 text-orange-800' }
                    }[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-700' };

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <p className="font-black text-slate-900">{req.requestReference}</p>
                          <p className="text-[10px] text-slate-400">{req.createdAt}</p>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{req.primaryCourt}</td>
                        <td className="p-3 font-bold text-indigo-900">
                          {req.principals.map(p => p.fullName || '---').join('، ')}
                        </td>
                        <td className="p-3 font-bold text-emerald-900">
                          {req.agents.map(a => a.fullName || '---').join('، ')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {req.dispositionTypes.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                                {t}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {req.propertyReferenceType === 'titled'
                              ? `رسم عدد ${req.propertyTitleNumber || '---'}/${req.propertyTitleIndex || ''}`
                              : req.propertyReferenceType === 'requisition'
                                ? `مطلب ${req.propertyRequisitionNumber || '---'}`
                                : 'عقار غير محفظ'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {req.clerkRegistrationNumber && (
                            <p className="text-[10px] text-emerald-800 font-bold mt-1">
                              رقم التقييد: {req.clerkRegistrationNumber}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setActiveTab('form_preview');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة النموذج</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: OFFICIAL FORM NO. 1 PREVIEW & PRINT (DECISION 381.25) */}
      {/* ========================================================================= */}
      {activeTab === 'form_preview' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('new_request')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                العودة للاستمارة
              </button>
              <div>
                <p className="text-xs font-black text-slate-900">
                  معاينة النموذج رقم 1: طلب تقييد وكالة في السجل المحلي للوكالات المتعلقة بالحقوق العينية
                </p>
                <p className="text-[11px] text-slate-400">
                  الصادر بقرار وزير العدل رقم 381.25 (المرسوم 2.23.101)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تحميل PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل النموذج PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center gap-2 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة النموذج (A4 / PDF)</span>
              </button>
            </div>
          </div>

          {/* Official Document Sheet (A4 styling) */}
          <div
            id="official-poa-form-1"
            style={{
              fontFamily: "'Amiri', 'Traditional Arabic', 'Cairo', Arial, sans-serif",
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
            className="bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-slate-200 max-w-4xl mx-auto text-slate-900 print:shadow-none print:border-none print:m-0 print:p-6 print:max-w-none"
          >
            {/* Document Header (SWITCHED: Right = Text, Center = Logo, Left = Real QR) */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6" dir="rtl">
              {/* 1. RIGHT SIDE: Ministry & Court Text Hierarchy */}
              <div className="text-right space-y-1 w-1/3">
                <p className="font-bold text-xs text-slate-900 m-0">المملكة المغربية</p>
                <p className="font-bold text-xs text-slate-800 m-0">وزارة العدل</p>
                <p className="text-xs text-slate-700 m-0">الهيئة الوطنية للعدول</p>
                <p className="text-xs text-slate-700 font-semibold m-0">{selectedRequest.appealCourt}</p>
                <p className="text-xs text-slate-900 font-black m-0">{selectedRequest.primaryCourt}</p>
                <p className="text-[11px] text-slate-600 m-0">السجل المحلي للوكالات المتعلقة بالحقوق العينية</p>
              </div>

              {/* 2. CENTER: Official Logo & Decision Reference */}
              <div className="text-center w-1/3 flex flex-col items-center justify-center space-y-1.5">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border border-slate-200 p-0.5 shadow-sm bg-white">
                  <img
                    src="/logos/adoul-logo.jpg"
                    alt="شعار الهيئة الوطنية للعدول بالمغرب"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[11px] text-slate-700 font-bold m-0 block">قرار وزير العدل 381.25</p>
                  <span className="inline-block text-xs bg-slate-900 text-white px-3 py-1 rounded font-black">
                    النموذج رقم 1
                  </span>
                </div>
              </div>

              {/* 3. LEFT SIDE: Real Scannable QR Code, Reference Number & Date */}
              <div className="text-left w-1/3 flex flex-col items-end justify-start space-y-1">
                <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-xs inline-block">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="رمز الاستجابة السريعة للتحقق"
                      className="w-20 h-20 object-contain block"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                      جاري إنشاء الرمز...
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-700 font-bold m-0">{selectedRequest.requestReference}</p>
                <p className="text-[10px] text-slate-600 font-bold m-0">التاريخ: {selectedRequest.createdAt}</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6 space-y-1.5">
              <h2 className="text-lg md:text-xl font-black text-slate-900 m-0">
                طلب تقييد وكالة في السجل المحلي للوكالات المتعلقة بالحقوق العينية
              </h2>
              <div className="w-56 h-0.5 bg-slate-900 mx-auto my-2"></div>
              <p className="text-xs text-slate-600 font-semibold m-0">
                (تطبيقاً للفصل 889-1 من قانون الالتزامات والعقود والمرسوم رقم 2.23.101 وقرار وزير العدل رقم 381.25)
              </p>
            </div>

            {/* Addressed To */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-6 text-xs font-bold text-slate-800">
              إلى السيد: رئيس كتابة الضبط بالمحكمة الابتدائية بـ <span className="text-slate-950 font-black">{selectedRequest.primaryCourt.replace('المحكمة الابتدائية ب', '').replace('المحكمة الابتدائية ', '')}</span>
            </div>

            {/* Section 1: Applicant Notary */}
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-black text-slate-900 bg-slate-100 p-2 rounded-lg border-r-4 border-slate-800">
                أولاً: بيانات صاحب الطلب (محرر الوكالة)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs pr-2">
                <div>
                  <span className="font-bold text-slate-500">الاسم الشخصي والعائلي:</span>{' '}
                  <span className="font-black text-slate-900">{selectedRequest.applicantNotaryName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">الصفة والمهنة:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedRequest.applicantCapacity} - {selectedRequest.applicantProfession}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-slate-500">المكتب والدائرة القضائية:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedRequest.applicantOffice}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Power of Attorney Details */}
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-black text-slate-900 bg-slate-100 p-2 rounded-lg border-r-4 border-slate-800">
                ثانياً: بيانات الوكالة المراد تقييدها
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs pr-2">
                <div>
                  <span className="font-bold text-slate-500">تاريخ الوكالة:</span>{' '}
                  <span className="font-black text-slate-900">{selectedRequest.poaDate} {selectedRequest.poaDateHijri ? `(${selectedRequest.poaDateHijri})` : ''}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">مكان التحرير:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedRequest.poaPlace}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">المرفق:</span>{' '}
                  <span className="font-bold text-emerald-800">نظير رسمي / نسخة إلكترونية مصادق عليها</span>
                </div>
              </div>
            </div>

            {/* Section 3: Parties */}
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-black text-slate-900 bg-slate-100 p-2 rounded-lg border-r-4 border-slate-800">
                ثالثاً: بيانات أطراف الوكالة
              </h3>

              {/* Principals */}
              <div className="space-y-2 pr-2">
                <p className="text-xs font-black text-slate-800">الموكل (الموكلون):</p>
                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border border-slate-300 text-right">الاسم الشخصي والعائلي</th>
                      <th className="p-2 border border-slate-300 text-right">رقم وثيقة التعريف</th>
                      <th className="p-2 border border-slate-300 text-right">العنوان الكامل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.principals.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border border-slate-300 font-bold">{p.fullName}</td>
                        <td className="p-2 border border-slate-300">{p.idNumber}</td>
                        <td className="p-2 border border-slate-300">{p.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Agents */}
              <div className="space-y-2 pr-2 pt-2">
                <p className="text-xs font-black text-slate-800">الوكيل (الوكلاء):</p>
                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border border-slate-300 text-right">الاسم الشخصي والعائلي</th>
                      <th className="p-2 border border-slate-300 text-right">رقم وثيقة التعريف</th>
                      <th className="p-2 border border-slate-300 text-right">العنوان الكامل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.agents.map((a, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border border-slate-300 font-bold">{a.fullName}</td>
                        <td className="p-2 border border-slate-300">{a.idNumber}</td>
                        <td className="p-2 border border-slate-300">{a.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Subject and Real Estate */}
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-black text-slate-900 bg-slate-100 p-2 rounded-lg border-r-4 border-slate-800">
                رابعاً: موضوع الوكالة وبيانات العقار
              </h3>
              <div className="space-y-2 text-xs pr-2">
                <div>
                  <span className="font-bold text-slate-500">نوع التصرف العقاري:</span>{' '}
                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedRequest.dispositionTypes.join('، ')}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">موضوع الوكالة بالتفصيل:</span>{' '}
                  <p className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1 leading-relaxed">
                    {selectedRequest.subjectDetails}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="font-bold text-slate-500">موقع العقار:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {selectedRequest.propertyRegion} - {selectedRequest.propertyProvince} ({selectedRequest.propertyCommune})
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">{selectedRequest.propertyAddress}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">المرجع العقاري:</span>{' '}
                    <span className="font-black text-slate-900">
                      {selectedRequest.propertyReferenceType === 'titled' && (
                        `الرسم العقاري عدد: ${selectedRequest.propertyTitleNumber || '---'}/${selectedRequest.propertyTitleIndex || ''}`
                      )}
                      {selectedRequest.propertyReferenceType === 'requisition' && (
                        `مطلب التحفيظ عدد: ${selectedRequest.propertyRequisitionNumber || '---'}`
                      )}
                      {selectedRequest.propertyReferenceType === 'other' && (
                        selectedRequest.propertyDescription || 'عقار غير محفظ'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signatures & Receipt Section */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-900 text-xs text-center">
              <div className="border border-slate-300 p-4 rounded-xl space-y-4">
                <p className="font-black text-slate-900">إطار خاص بكتابة الضبط</p>
                <p className="text-[11px] text-slate-500">تاريخ التوصل والإيداع: ......./......./ 2026</p>
                <p className="text-[11px] text-slate-500">رقم الإيداع: ..............................</p>
                <p className="text-[11px] text-slate-500">رقم التقييد بالسجل: ..............................</p>
                <div className="pt-6">
                  <p className="font-bold">توقيع وخاتم رئيس كتابة الضبط</p>
                </div>
              </div>

              <div className="p-4 rounded-xl space-y-6 flex flex-col justify-between">
                <div className="text-right">
                  <p className="font-bold text-slate-800">
                    حرر بـ: <span className="font-black">{selectedRequest.poaPlace}</span> في: <span className="font-black">{selectedRequest.createdAt}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-black text-sm text-slate-900">توقيع وخاتم العدل محرر الوكالة</p>
                  <p className="text-xs text-slate-700 font-bold">{selectedRequest.applicantNotaryName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealEstatePowerOfAttorneyRegistrationPortal;
