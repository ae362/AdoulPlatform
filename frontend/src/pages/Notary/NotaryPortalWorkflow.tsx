import React, { useState, useMemo, useCallback } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import MarriagePermissionForm from './MarriagePermissionForm';
import WorkCertificateForm from './WorkCertificateForm';
import AdlCopyPermissionForm from './AdlCopyPermissionForm';
import { IndividualReceptionPermissionForm } from './IndividualReceptionPermissionForm';
import { MarriageDocumentView } from '../../components/MarriageDocumentView';
import { WorkCertificateDocumentView } from '../../components/WorkCertificateDocumentView';
import { AdlCopyDocumentView } from '../../components/AdlCopyDocumentView';
import { MarriagePermissionApprovalTemplate } from '../../components/MarriagePermissionApprovalTemplate';
import { WorkCertificateApprovalTemplate } from '../../components/WorkCertificateApprovalTemplate';
import { IndividualReceptionDocumentTemplate } from '../../components/IndividualReceptionDocumentTemplate';
import { printElement } from '../../utils/print';

import { NationalRequestsManagement } from '../../modules/NationalRequestsManagement';

interface NotificationWithWorkflow {
  id: string;
  // Phase 1: Creation
  requestNumber: string;
  notaryFullName: string;
  professionalNumber: string;
  appointmentDecreeNumber: string;
  officeNumber: string;
  jurisdiction: string;
  targetCourt: string;
  certificateType: string;
  receptionPlace: string;
  receptionDate: string;
  involvedNames: string;
  reasonForMovement: string;
  requestedDuration: number;
  durationUnit: string;
  attachments?: string[];
  notes?: string;
  submissionDate: string;
  submissionTime: string;

  // Phase 2: Processing
  phase: 'قيد_المعالجة' | 'قيد_المعالجة_مع_استعلام' | 'القرار_النهائي' | 'وثيقة_رسمية' | 'مرسل_للعدل';
  councilInternalNotes?: string;
  councilEvaluation?: string;
  assignedTo?: string;

  // Phase 3: Decision
  decisionType?: 'موافقة' | 'موافقة_مع_شروط' | 'رفض' | 'تأجيل';
  decisionReasoning?: string;
  conditions?: string[];
  decidedDate?: string;

  // Phase 4: Official Document
  documentNumber?: string;
  documentContent?: string;
  qrCode?: string;
  digitalSignature?: boolean;
  electronicSeal?: boolean;
  issuedDate?: string;

  // Phase 5: Response
  sharedWithNotary?: boolean;
  viewedByNotary?: boolean;
  viewedDate?: string;
  printCount?: number;
  shareToken?: string;
}

// Helper to parse the formatted notes back into an object for easier display
const parseMarriageNotes = (notes: string | undefined | null) => {
  if (!notes) return null;
  const result: any = {};
  if (notes.includes('--- DATA JSON START ---')) {
    try {
      const jsonPart = notes.split('--- DATA JSON START ---')[1].split('--- DATA JSON END ---')[0].trim();
      return JSON.parse(jsonPart);
    } catch (e) {
      console.error('Failed to parse JSON in notes');
    }
  }
  return null;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

const NotaryPortalWorkflow: React.FC = () => {
  const { user, notaryProfile } = useAuth();
  const profile = notaryProfile as any;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'list' | 'notifications_responses' | 'permissions_responses' | 'national_requests' | 'archive'>('national_requests');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any>(null);
  const [selectedRequestView, setSelectedRequestView] = useState<any>(null);
  const [selectedTrackingView, setSelectedTrackingView] = useState<any>(null);

  const parsedAdlData = useMemo(() => {
    if (!selectedDecision?.notes) return null;
    try {
      if (selectedDecision.notes.includes('--- DATA JSON START ---')) {
        const jsonPart = selectedDecision.notes.split('--- DATA JSON START ---')[1].split('--- DATA JSON END ---')[0].trim();
        return JSON.parse(jsonPart);
      }
    } catch (e) {
      console.error('Failed to parse decision notes', e);
    }
    return null;
  }, [selectedDecision]);
  
  const handleDecisionPrint = useCallback(() => {
    const printable = document.getElementById('printable-decision');
    if (!printable) {
      window.print();
      return;
    }

    printElement(printable, {
      title: 'Decision Print',
    });
  }, []);
  const [recipientType, setRecipientType] = useState<'judge' | 'regional_council' | 'both'>('judge');
  const [isSubmittingMarriage, setIsSubmittingMarriage] = useState(false);
  const [marriagePreviewData, setMarriagePreviewData] = useState<any>(null);
  const [isSubmittingWorkCert, setIsSubmittingWorkCert] = useState(false);
  const [workCertPreviewData, setWorkCertPreviewData] = useState<any>(null);
  const [isSubmittingAdlCopy, setIsSubmittingAdlCopy] = useState(false);
  const [adlCopyPreviewData, setAdlCopyPreviewData] = useState<any>(null);
  const [isSubmittingIndividual, setIsSubmittingIndividual] = useState(false);
  type RequestKind = 'permission_direction' | 'permission_scientific' | 'marriage_permission' | 'work_certificate_permission' | 'adl_copy_permission' | 'individual_reception_permission';
  const [requestKind, setRequestKind] = useState<RequestKind | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    professionalNumber: '',
    appointmentDecreeNumber: '',
    appointmentDate: '',
    officeNumber: '',
    jurisdiction: '',
    targetCourt: '',
    certificateType: '',
    applicantCapacity: '',
    companionAdoulName: '',
    trackingNotificationNumber: '',
    trackingPermissionNumber: '',
    trackingDate: new Date().toISOString().split('T')[0],
    receptionPlace: '',
    receptionDate: new Date().toISOString().split('T')[0],
    receptionTime: '10:00',
    involvedNames: '',
    writingPlace: '',
    reasonForMovement: '',
    requestedDuration: '1',
    durationUnit: 'يوم',
    notes: '',
    attachments: '',
  });

  // Handle tab from URL query param
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'create', 'list', 'notifications_responses', 'permissions_responses', 'archive'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, []);

  // Pre-fill form with notary data
  React.useEffect(() => {
    if (user && activeTab === 'create') {
      const officeAddr = notaryProfile?.office_address;
      const displayJurisdiction = (officeAddr && officeAddr !== 'غير محدد' && !officeAddr.includes('تلقائي')) 
        ? officeAddr 
        : (notaryProfile?.primary_court || '');

      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.full_name || '',
        professionalNumber: prev.professionalNumber || (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
        appointmentDecreeNumber: prev.appointmentDecreeNumber || notaryProfile?.appointment_decree_number || '',
        appointmentDate: prev.appointmentDate || (notaryProfile as any)?.appointment_date || '',
        jurisdiction: displayJurisdiction, 
        targetCourt: prev.targetCourt || notaryProfile?.primary_court || '',
      }));
    }
  }, [user, notaryProfile, activeTab]);

  // Fetch real data from database
  const { data: dashboardStats, isLoading: statsLoading } = trpc.notifications.getDashboardStats.useQuery({ 
    year: new Date().getFullYear(),
    notaryId: user?.id 
  }, { enabled: !!user?.id });
  
  const { data: notificationsList, isLoading: listLoading, refetch: refetchNotifications } = trpc.notifications.getRequestsList.useQuery(
    { 
      limit: 50,
      offset: 0,
      notaryId: user?.id,
    },
    {
      enabled: !!user?.id,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    }
  );

  // Fetch monthly stats for complete picture
  const { data: monthlyStats } = trpc.notifications.getMonthlyStats.useQuery({ 
    year: new Date().getFullYear(),
    notaryId: user?.id
  }, { enabled: !!user?.id });

  // Mutation for creating new notifications
  const createNotificationMutation = trpc.notifications.createNotification.useMutation({
    onSuccess: (result) => {
      const recipient = (result as any)?.notification?.recipient_type || recipientType;
      const recipientLabel = recipient === 'regional_council' ? 'المجلس الجهوي' : 'قاضي التوثيق';

      // Reset form
      setFormData({
        fullName: '',
        professionalNumber: '',
        appointmentDecreeNumber: '',
        appointmentDate: '',
        officeNumber: '',
        jurisdiction: '',
        targetCourt: '',
        certificateType: '',
        applicantCapacity: '',
        companionAdoulName: '',
        trackingNotificationNumber: '',
        trackingPermissionNumber: '',
        trackingDate: new Date().toISOString().split('T')[0],
        receptionPlace: '',
        receptionDate: new Date().toISOString().split('T')[0],
        receptionTime: '10:00',
        involvedNames: '',
        writingPlace: '',
        reasonForMovement: '',
        requestedDuration: '1',
        durationUnit: 'يوم',
        notes: '',
        attachments: '',
      });
      setRequestKind(null);
      // Switch to list tab
      setActiveTab('list');
      setShowPreview(false);
      // Refresh the list
      refetchNotifications();
      // Show success message
      alert(`✓ تم إرسال الإشعار بنجاح. سيتم معالجته من طرف ${recipientLabel}.`);
    },
    onError: (error: any) => {
      console.error('Error creating notification:', error);
      const errorMsg = error?.message || error?.data?.zodError?.[0]?.message || 'فشل في حفظ الإشعار';
      alert('✗ خطأ: ' + errorMsg);
    },
  });

  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!dashboardStats) {
      return {
        totalSubmitted: 0,
        pending: 0,
        approved: 0,
        withInquiry: 0,
      };
    }
    return {
      totalSubmitted: dashboardStats.totalIncoming || 0,
      pending: (notificationsList?.filter(n => n.status === 'قيد_المعالجة').length) || 0,
      approved: dashboardStats.totalApproved || 0,
      withInquiry: (notificationsList?.filter(n => n.status === 'قيد_المعالجة_مع_استعلام').length) || 0,
    };
  }, [dashboardStats, notificationsList]);

  // Use real notifications instead of mock data
  const notaryNotifications = notificationsList || [];

  const { decisionsTotal, markDecisionSeen, isDecisionSeen } = useMessagingNotifications();

  const pendingRequestsCount = useMemo(() => {
    return (notaryNotifications as any[]).filter(n => !(n.decision_type || n.decisionType)).length;
  }, [notaryNotifications]);

  const isPermissionDecision = React.useCallback((n: any) => {
    const cert = String(n?.certificate_type ?? n?.certificateType ?? '');
    // Work certificates are always notifications
    if (cert.includes('شهادة العمل')) return false;
    // Marriage portal, Article 50 reception, or explicit "الإذن"
    return cert.includes('بوابة') || cert.includes('الإذن') || cert.includes('تلقي') || cert.includes('زواج') || cert.includes('INDIVIDUAL_RECEPTION');
  }, []);

  // Split all requests into "الاشعارات" and "الاذنات" (not just decisions)
  const permissionsRequests = useMemo(() => {
    return (notaryNotifications as any[]).filter(n => isPermissionDecision(n));
  }, [isPermissionDecision, notaryNotifications]);

  const notificationsRequests = useMemo(() => {
    return (notaryNotifications as any[]).filter(n => !isPermissionDecision(n));
  }, [isPermissionDecision, notaryNotifications]);

  // Sub-filter for decisions (for badges)
  const permissionsDecisionsCount = useMemo(() => {
    return permissionsRequests.filter(n => (n.decision_type || n.decisionType) && !isDecisionSeen(String(n.id))).length;
  }, [permissionsRequests, isDecisionSeen]);

  const notificationsDecisionsCount = useMemo(() => {
    return notificationsRequests.filter(n => (n.decision_type || n.decisionType) && !isDecisionSeen(String(n.id))).length;
  }, [notificationsRequests, isDecisionSeen]);

  const filteredNotifications = useMemo(() => {
    if (!notaryNotifications) return [];
    if (!searchQuery) return notaryNotifications;
    
    const query = searchQuery.toLowerCase();
    return notaryNotifications.filter((notif: any) => 
      (notif.request_number || notif.id || '').toLowerCase().includes(query) ||
      (notif.target_court || notif.jurisdiction || '').toLowerCase().includes(query) ||
      (notif.notary_name || notif.notary_full_name || '').toLowerCase().includes(query) ||
      (notif.status || notif.phase || '').toLowerCase().includes(query)
    );
  }, [notaryNotifications, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!requestKind) {
      alert('يرجى اختيار نوع الطلب قبل تعبئة البيانات.');
      return;
    }
    
    // Validate required fields
    if (!formData.fullName || !formData.professionalNumber || !formData.jurisdiction) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (requestKind === 'permission_direction') {
      if (!formData.targetCourt || !formData.certificateType || !formData.receptionPlace || !formData.receptionDate || !formData.receptionTime || !formData.involvedNames || !formData.requestedDuration || !formData.reasonForMovement) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
    } else {
      if (!formData.certificateType || !formData.applicantCapacity || !formData.reasonForMovement || !formData.trackingPermissionNumber || !formData.trackingDate) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
    }

    // Move to preview step instead of immediate mutation
    setShowPreview(true);
  };

  const uploadMutation = trpc.notifications.uploadFile.useMutation();

  const handleMarriageSubmit = async (data: any) => {
    setIsSubmittingMarriage(true);
    try {
      // 1. Logic to upload all files first
      const uploadedAttachments: { name: string; url: string }[] = [];

      const processDocs = async (docs: any) => {
        if (!docs) return;
        for (const key of Object.keys(docs)) {
          const doc = docs[key];
          if (doc.file instanceof File) {
            try {
              const base64 = await fileToBase64(doc.file);
              const uploadResult = await uploadMutation.mutateAsync({
                file: {
                  name: doc.file.name,
                  type: doc.file.type || 'application/pdf',
                  size: doc.file.size,
                  base64: base64
                }
              });
              // Update the data object with the URL so it's saved in JSON
              doc.uploadedUrl = uploadResult.url;
              uploadedAttachments.push({ name: doc.file.name, url: uploadResult.url });
            } catch (err) {
              console.error('Error uploading file:', doc.file.name, err);
            }
          }
        }
      };

      await processDocs(data.suitorDocs);
      await processDocs(data.fianceeDocs);

      // Instead of immediate submission, set data for preview and show it
      setMarriagePreviewData({ ...data, uploadedAttachments });
      setShowPreview(true);
      
    } catch (err) {
      console.error('Submission failed:', err);
      alert('فشل إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmittingMarriage(false);
    }
  };

  const handleWorkCertSubmit = async (data: any) => {
    setIsSubmittingWorkCert(true);
    try {
      // 1. Logic to upload attachments
      const uploadedAttachments: { name: string; url: string }[] = [];

      if (data.attachments) {
        for (const key of Object.keys(data.attachments)) {
          const file = data.attachments[key];
          if (file instanceof File) {
             try {
               const base64 = await fileToBase64(file);
               const uploadResult = await uploadMutation.mutateAsync({
                 file: {
                   name: file.name,
                   type: file.type || 'application/pdf',
                   size: file.size,
                   base64: base64
                 }
               });
               uploadedAttachments.push({ name: file.name, url: uploadResult.url });
             } catch (err) {
               console.error('Error uploading file:', file.name, err);
             }
          }
        }
      }

      // Store in preview data
      setWorkCertPreviewData({ ...data, uploadedAttachments });
      setShowPreview(true);
      
    } catch (err) {
      console.error('Work Certificate submission failed:', err);
      alert('فشل إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmittingWorkCert(false);
    }
  };

  const handleAdlCopySubmit = async (data: any) => {
    setIsSubmittingAdlCopy(true);
    try {
      const uploadedAttachments: { name: string; url: string; type: string }[] = [];

      // 1. Handle main ID card file if exists
      if (data.idCardFile) {
        try {
          const base64 = data.idCardBase64 || await fileToBase64(data.idCardFile);
          const uploadResult = await uploadMutation.mutateAsync({
            file: {
              name: `ID_CARD_${data.idCardFile.name}`,
              type: data.idCardFile.type,
              size: data.idCardFile.size,
              base64: base64
            }
          });
          if (uploadResult?.url) {
            uploadedAttachments.push({
              name: 'بطاقة التعريف الوطنية',
              url: uploadResult.url,
              type: data.idCardFile.type
            });
            data.idCardUrl = uploadResult.url; // Save URL in data for direct access
          }
        } catch (err) {
          console.error('Error uploading ID card:', err);
        }
      }

      if (data.attachments && Array.isArray(data.attachments)) {
        for (const att of data.attachments) {
          // Robust check: try to get base64 and name/type from either the file object or the att object itself
          let base64 = att.base64;
          let fileName = att.file?.name || `attachment_${Date.now()}.pdf`;
          let fileType = att.file?.type || att.type || 'application/pdf';
          let fileSize = att.file?.size || 0;

          if (att.file instanceof File && !base64) {
             try {
               base64 = await fileToBase64(att.file);
             } catch (e) {
               console.error('Error pre-reading file:', e);
             }
          }

          if (base64) {
             try {
               const uploadResult = await uploadMutation.mutateAsync({
                 file: {
                   name: fileName,
                   type: fileType,
                   size: fileSize,
                   base64: base64
                 }
               });
               
               if (uploadResult?.url) {
                 uploadedAttachments.push({ 
                   name: att.description || fileName, 
                   url: uploadResult.url,
                   type: fileType
                 });
                 att.uploadedUrl = uploadResult.url;
               }
             } catch (err) {
               console.error('Error uploading file to storage:', fileName, err);
             }
          }
        }
      }

      setAdlCopyPreviewData({ ...data, uploadedAttachments });
      setShowPreview(true);
      
    } catch (err) {
      console.error('ADL Copy submission failed:', err);
      alert('فشل إرسال الطلب. يرجى المراجعة والمحاولة مرة أخرى.');
    } finally {
      setIsSubmittingAdlCopy(false);
    }
  };

  const handleFinalSend = () => {
    if (!requestKind) {
      alert('يرجى اختيار نوع الطلب قبل الإرسال.');
      return;
    }

    if (requestKind === 'marriage_permission' && marriagePreviewData) {
      const data = marriagePreviewData;
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => (
        key === 'base64' || key === 'file' || key.toLowerCase().includes('base64') || key.toLowerCase().includes('file') ? undefined : value
      )));
      const suitorName = `${data.suitorFirstNameAr} ${data.suitorLastNameAr}`;
      const fianceeName = `${data.fianceeFirstNameAr} ${data.fianceeLastNameAr}`;

      const formattedNotes = `
🔴 طلب الاذن بالزواج عبر بوابة العدل
----------------------------------
رقم الملف: MAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}
المحكمة: ${data.court}
القاضي: ${data.judgeName || 'غير محدد'}

👤 بيانات الخاطب:
الاسم: ${suitorName} (${data.suitorFirstNameLat} ${data.suitorLastNameLat})
CIN: ${data.suitorCIN} | الحالة: ${data.suitorFamilyStatus}

👩 بيانات المخطوبة:
الاسم: ${fianceeName} (${data.fianceeFirstNameLat} ${data.fianceeLastNameLat})
CIN: ${data.fianceeCIN} | الحالة: ${data.fianceeFamilyStatus}

💍 تفاصيل الزواج:
النوع: ${data.marriageType}
الولي: ${data.hasGuardian === 'نعم' ? `نعم (${data.guardianName} - ${data.guardianCapacity})` : 'لا'}

🔐 التوقيعات:
- توقيع الخاطب: ${data.suitorSignature ? '✅ مكتمل' : '❌ ناقص'}
- توقيع المخطوبة: ${data.fianceeSignature ? '✅ مكتمل' : '❌ ناقص'}

${data.intake_id ? `🆔 رقم Intake: ${data.intake_id}` : ''}

--- DATA JSON START ---
${JSON.stringify(cleanData)}
--- DATA JSON END ---

الصيغة النصية المولدة:
${data.generatedDraft || 'لم يتم توليد نص العقد'}
`;

      createNotificationMutation.mutate({
        fullName: (notaryProfile as any)?.full_name || formData.fullName || 'العدل',
        professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber || '0000',
        officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber || '0000',
        appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
        appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
        jurisdiction: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
        appellateCourt: notaryProfile?.appellate_court,
        targetCourt: data.court,
        certificateType: 'طلب الاذن بالزواج عبر بوابة العدل',
        receptionPlace: data.suitorAddress,
        receptionDate: new Date().toISOString().split('T')[0],
        receptionTime: new Date().toLocaleTimeString('ar-MA').substring(0, 5),
        writingPlace: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
        involvedNames: `${suitorName} و ${fianceeName}`,
        recipientType: 'judge',
        reasonForMovement: `طلب الاذن بالزواج - ${data.marriageType}`,
        requestedDuration: '1',
        durationUnit: 'يوم',
        notes: formattedNotes,
        attachments: data.uploadedAttachments ? JSON.stringify(data.uploadedAttachments) : '[]', 
        notaryId: user?.id,
      });
      return;
    }

    if (requestKind === 'work_certificate_permission' && workCertPreviewData) {
      const data = workCertPreviewData;
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => (
        key === 'base64' || key === 'file' || key.toLowerCase().includes('base64') || key.toLowerCase().includes('file') ? undefined : value
      )));
      
      const formattedNotes = `
📋 مخطط هيكلي: طلب شهادة عمل للعدل
----------------------------------
1️⃣ طبقة الاستقبال (Intake):
رقم الطلب الفريد: ${data.fileNumber}
تاريخ الإرسال: ${data.creationDate}
التصنيف: ${data.certificateType}
الربط القانوني: المادة 14 (الممارسة) والمادة 44 (الشهادة)

2️⃣ بيانات العدل الممارس:
الاسم الكامل: ${data.fullName}
الرقم المهني: ${data.professionalNumber}
المحكمة: ${data.court}
الهوية (CIN): ${data.cin}

3️⃣ المرفقات والتحقق الإداري:
- اكتمال البيانات: تم التحقق آلياً
- أجل المعالجة: 15 يوماً

📍 العنوان والاتصال:
عنوان المكتب: ${data.officeAddress}
الحالة المهنية: ${data.employmentStatus}

--- DATA JSON START ---
${JSON.stringify(cleanData)}
--- DATA JSON END ---
`;

      createNotificationMutation.mutate({
        fullName: data.fullName,
        professionalNumber: data.professionalNumber,
        officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber || '0000',
        appointmentDecreeNumber: data.appointmentDecreeNumber,
        appointmentDate: data.appointmentDate,
        jurisdiction: data.court,
        appellateCourt: notaryProfile?.appellate_court,
        targetCourt: data.court,
        certificateType: 'طلب شهادة العمل عبر بوابة العدل',
        receptionPlace: data.officeAddress,
        receptionDate: new Date().toISOString().split('T')[0],
        receptionTime: new Date().toLocaleTimeString('ar-MA').substring(0, 5),
        writingPlace: data.court,
        involvedNames: data.fullName,
        recipientType: 'judge',
        reasonForMovement: `طلب شهادة العمل - ${data.certificateType}`,
        requestedDuration: '1',
        durationUnit: 'يوم',
        notes: formattedNotes,
        attachments: data.uploadedAttachments ? JSON.stringify(data.uploadedAttachments) : '[]', 
        notaryId: user?.id,
      });
      return;
    }

    if (requestKind === 'adl_copy_permission' && adlCopyPreviewData) {
      const data = adlCopyPreviewData;
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => (
        key === 'base64' || key === 'file' || key.toLowerCase().includes('base64') || key.toLowerCase().includes('file') ? undefined : value
      )));
      
      const formattedNotes = `
📜 طلب الإذن لاستخراج نسخ/نظائر الرسوم العدلية
-------------------------------------------
👤 طالب الاستخراج: ${data.applicantFirstName} ${data.applicantLastName}
📄 نوع الهوية: ${data.idDocumentType} | رقم: ${data.idDocumentNumber}
� الحالة المدنية: ${data.civilStatusNumber || 'غير متوفر'} | السكنى: ${data.residencyCertNumber || 'غير متوفر'}
🏗️ الجهة المصدرة: ${data.issuingAuthority}
📍 العنوان: ${data.fullAddress}
🎂 تاريخ الازدياد: ${data.dateOfBirth} | المهنة: ${data.profession} | الحالة: ${data.socialStatus}

📌 الصفة: ${data.requestFor}
${data.requestFor === 'لفائدة الغير' ? `👤 المعني بالأمر: ${data.beneficiaryName}\n🔗 العلاقة: ${data.legalRelationship}` : ''}

🎯 نوع الوثيقة المطلوبة: ${data.documentType}

📑 مراجع الرسم العدلي:
${data.deeds.map((d: any, i: number) => `
رسم #${i + 1}:
دفتر: ${d.register} | رقم: ${d.number} | حرف: ${d.letter}
صحيفة: ${d.page} | عدد: ${d.count} | تاريخ: ${d.date}`).join('\n')}

--- DATA JSON START ---
${JSON.stringify(cleanData)}
--- DATA JSON END ---

الصيغة النصية:
${data.generatedText}
`;

      createNotificationMutation.mutate({
        fullName: (notaryProfile as any)?.full_name || formData.fullName || 'العدل',
        professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber || '0000',
        officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber || '0000',
        appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
        appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
        jurisdiction: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
        appellateCourt: notaryProfile?.appellate_court,
        targetCourt: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
        certificateType: 'طلب استخراج نسخ/نظائر الرسوم العدلية',
        receptionPlace: data.fullAddress,
        receptionDate: new Date().toISOString().split('T')[0],
        receptionTime: new Date().toLocaleTimeString('ar-MA').substring(0, 5),
        writingPlace: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
        involvedNames: `${data.applicantFirstName} ${data.applicantLastName}`,
        recipientType: 'judge',
        reasonForMovement: `استخراج ${data.documentType}`,
        requestedDuration: '1',
        durationUnit: 'يوم',
        notes: formattedNotes,
        attachments: data.uploadedAttachments ? JSON.stringify(data.uploadedAttachments) : '[]', 
        notaryId: user?.id,
      });
      return;
    }

    const professionalResponsibilityText =
      'يتحمل العدل المسؤولية المهنية كاملة عن صحة المعطيات والوثائق المدلى بها، وعن مطابقتها للواقع وللمقتضيات القانونية والتنظيمية الجاري بها العمل.';

    const effectiveTargetCourt =
      requestKind === 'permission_scientific'
        ? (formData.jurisdiction || formData.targetCourt || '')
        : formData.targetCourt;

    const adoulsNames = [formData.fullName, formData.companionAdoulName].filter(Boolean).join('، ');

    const trackingRefs =
      requestKind === 'permission_scientific'
        ? `مراجع التتبع: رقم إشعار: ${formData.trackingNotificationNumber || '-'} | رقم إذن: ${formData.trackingPermissionNumber || '-'} | تاريخ: ${formData.trackingDate || '-'}`
        : '';

    const composedNotes =
      requestKind === 'permission_scientific'
        ? [
            `نوع الطلب: طلب إذن بتلقي شهادة علمية/مثلية`,
            `نوع الشهادة العلمية: ${formData.certificateType || '-'}`,
            `صفة الطالب: ${formData.applicantCapacity || '-'}`,
            `موضوع الشهادة: ${formData.reasonForMovement || '-'}`,
            `أسماء العدلين: ${adoulsNames || '-'}`,
            trackingRefs,
            `المسؤولية المهنية: ${professionalResponsibilityText}`,
            formData.notes?.trim() ? `ملاحظات إضافية: ${formData.notes.trim()}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        : formData.notes;

    // Call the mutation to save to database
    createNotificationMutation.mutate({
      fullName: (notaryProfile as any)?.full_name_ar || (notaryProfile as any)?.full_name || formData.fullName || 'عدل غير معرف',
      professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber || '0000',
      appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
      appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
      officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber || '00',
      jurisdiction: (notaryProfile as any)?.jurisdiction || (notaryProfile as any)?.primary_court || formData.jurisdiction || 'غير محدد', // Primary court
      appellateCourt: (notaryProfile as any)?.appellate_court || notaryProfile?.appellate_court, // Appellate court
      targetCourt: effectiveTargetCourt || (notaryProfile as any)?.primary_court || 'المحكمة الابتدائية',
      certificateType: requestKind === 'individual_reception_permission' ? 'INDIVIDUAL_RECEPTION' : (formData.certificateType || 'طلب إداري'),
      receptionPlace: formData.receptionPlace || 'مكتب العدل',
      receptionDate: formData.receptionDate || new Date().toISOString().split('T')[0],
      receptionTime: formData.receptionTime,
      writingPlace: formData.writingPlace || formData.jurisdiction || 'غير محدد',
      involvedNames: formData.involvedNames || 'غير محدد',
      recipientType: requestKind === 'permission_scientific' ? 'judge' : recipientType,
      reasonForMovement: formData.reasonForMovement || 'لا يوجد تعليل إضافي',
      requestedDuration: requestKind === 'permission_scientific' ? '1' : (formData.requestedDuration || '1'),
      durationUnit: requestKind === 'permission_scientific' ? 'يوم' : (formData.durationUnit || 'يوم'),
      notes: composedNotes,
      attachments: formData.attachments,
      notaryId: user?.id || '', // Send current user's ID
    });
  };

  const renderTemplatePreview = () => {
    if (requestKind === 'marriage_permission' && marriagePreviewData) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl">💍</div>
              <div>
                <h3 className="text-xl font-black text-emerald-900">مراجعة طلب الإذن بالزواج</h3>
                <p className="text-sm text-emerald-700 font-bold opacity-80">يرجى مراجعة البيانات النهائية قبل الإرسال للمحكمة.</p>
              </div>
            </div>
          </div>
          
          <div id="printable-marriage-preview" className="no-print">
             <MarriageDocumentView 
               data={marriagePreviewData} 
               notaryData={{
                 fullName: (notaryProfile as any)?.full_name || formData.fullName,
                 jurisdiction: (notaryProfile as any)?.jurisdiction || (notaryProfile as any)?.primary_court || formData.jurisdiction,
                 professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
               }}
             />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 no-print pb-20">
            <button
              onClick={handleFinalSend}
              disabled={createNotificationMutation.isPending}
              className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-5 rounded-2xl font-bold text-xl hover:bg-red-900 transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {createNotificationMutation.isPending ? (
                <>
                  <span className="animate-spin text-2xl">🌀</span>
                  جاري إرسال الطلب...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  تأكيد نهائي وإرسال للمحكمة
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowPreview(false);
                // The form will still be there in the 'create' tab state
              }}
              className="flex-1 px-8 py-5 border-2 border-red-950 text-red-950 rounded-2xl font-bold text-lg hover:bg-red-50 transition-all active:scale-[0.98]"
            >
              ✍️ تعديل البيانات
            </button>
          </div>
        </div>
      );
    }

    if (requestKind === 'work_certificate_permission' && workCertPreviewData) {
      const data = workCertPreviewData;
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl">📄</div>
              <div>
                <h3 className="text-xl font-black text-blue-900">مراجعة طلب شهادة العمل</h3>
                <p className="text-sm text-blue-700 font-bold opacity-80">يرجى مراجعة بيانات الشهادة الإدارية كما ستظهر للسيد القاضي.</p>
              </div>
            </div>
          </div>
          
          <div className="mx-auto max-w-4xl scale-95 origin-top mb-10">
             <WorkCertificateDocumentView 
                data={data}
                notaryData={{
                  fullName: (notaryProfile as any)?.full_name || formData.fullName,
                  jurisdiction: (notaryProfile as any)?.jurisdiction || (notaryProfile as any)?.primary_court || formData.jurisdiction,
                  professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                }}
             />
             <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl mt-6">
                <p className="text-blue-900 font-bold flex items-center gap-2 mb-2">
                  <span>ℹ️</span> ملاحظة:
                </p>
                <p className="text-blue-800 text-sm leading-relaxed text-center font-bold">
                   سيتم إرسال هذا الطلب إلكترونياً إلى مكتب السيد قاضي التوثيق للبت فيه فور تأكيدكم.
                </p>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 no-print pb-20 justify-center max-w-2xl mx-auto">
            <button
              onClick={handleFinalSend}
              disabled={createNotificationMutation.isPending}
              className="flex-[2] bg-blue-900 text-white px-8 py-5 rounded-2xl font-bold text-xl hover:bg-black transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {createNotificationMutation.isPending ? 'جاري الإرسال...' : 'تأكيد الطلب وإيداعه'}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 px-8 py-5 border-2 border-blue-900 text-blue-900 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all active:scale-[0.98]"
            >
              تعديل
            </button>
          </div>
        </div>
      );
    }

    if (requestKind === 'adl_copy_permission' && adlCopyPreviewData) {
      const data = adlCopyPreviewData;
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center text-2xl">📜</div>
              <div>
                <h3 className="text-xl font-black text-amber-900">مراجعة طلب استخراج نسخة/نظير</h3>
                <p className="text-sm text-amber-700 font-bold opacity-80">يرجى مراجعة شكل الطلب النهائي كما تم استخراجه من الوثيقة القانونية.</p>
              </div>
            </div>
          </div>
          
          <div className="no-print">
             <AdlCopyDocumentView 
                data={data}
                notaryData={{
                  fullName: (notaryProfile as any)?.full_name || formData.fullName,
                  jurisdiction: (notaryProfile as any)?.jurisdiction || (notaryProfile as any)?.primary_court || formData.jurisdiction,
                  professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                }}
             />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 no-print pb-20 justify-center max-w-2xl mx-auto">
            <button
              onClick={handleFinalSend}
              disabled={createNotificationMutation.isPending}
              className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-5 rounded-2xl font-bold text-xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {createNotificationMutation.isPending ? 'جاري الإرسال...' : 'تأكيد وإرسال للمحكمة'}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 px-8 py-5 border-2 border-red-950 text-red-950 rounded-2xl font-bold text-lg hover:bg-red-50 transition-all active:scale-[0.98]"
            >
              تعديل
            </button>
          </div>
        </div>
      );
    }

    return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 max-w-4xl mx-auto space-y-10 animate-fadeIn relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full opacity-50"></div>

      {requestKind === 'permission_scientific' ? (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 font-bold">
          نوع الطلب: طلب إذن بتلقي شهادة علمية/مثلية
        </div>
      ) : requestKind === 'permission_direction' ? (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 font-bold">
          نوع الطلب: طلب إذن بشهادة التوجه
        </div>
      ) : requestKind === 'marriage_permission' ? (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 font-bold">
          نوع الطلب: طلب الإذن بالزواج
        </div>
      ) : null}
      
      {/* Header of the document - Custom for Scientific and Marriage */}
      {requestKind !== 'permission_scientific' && requestKind !== 'marriage_permission' && (
        <div className="text-center space-y-4 border-b pb-8">
          <h2 className="text-3xl font-bold text-gray-900 underline underline-offset-[12px] decoration-red-950/20 font-maghribi">
            {recipientType === 'judge' ? 'إشعار موجه إلى السيد قاضي التوثيق' : 'إشعار موجه إلى السيد رئيس المجلس الجهوي'}
          </h2>
          <p className="text-2xl font-black text-red-950 mt-4">
            {recipientType === 'judge' ? (formData.jurisdiction || '____________') : (notaryProfile?.appellate_court || '____________')}
          </p>
        </div>
      )}

      {/* Body of the document */}
      <div className="space-y-8 text-xl leading-relaxed text-right" dir="rtl">
        {requestKind === 'marriage_permission' && marriagePreviewData ? (
          <div className="mx-auto max-w-4xl scale-95 origin-top mb-10">
             <MarriageDocumentView 
                data={marriagePreviewData}
                notaryData={{
                  fullName: (notaryProfile as any)?.full_name || formData.fullName,
                  jurisdiction: (notaryProfile as any)?.jurisdiction || (notaryProfile as any)?.primary_court || formData.jurisdiction,
                  professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                }}
             />
             <div className="bg-red-50 border border-red-200 p-6 rounded-3xl mt-6">
                <p className="text-red-900 font-bold flex items-center gap-2 mb-2">
                  <span>⚠️</span> تنبيه هام:
                </p>
                <p className="text-red-800 text-sm leading-relaxed text-center font-bold">
                   يرجى مراجعة كافة المعلومات أعلاه بعناية قبل الإرسال النهائي للسيد قاضي التوثيق.
                </p>
             </div>
          </div>
        ) : requestKind === 'permission_scientific' ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-2 font-bold mb-8">
              <p>من العدلين المنتصبين للشهادة بدائرة محكمة الاستئناف بـ: <span className="text-red-950">{notaryProfile?.appellate_court || '__________'}</span></p>
              <p>إلى السيد قاضي التوثيق وشؤون القاصرين بالمحكمة الابتدائية بـ: <span className="text-red-950">{formData.jurisdiction || '__________'}</span></p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center shadow-inner">
              <p className="font-bold text-red-950 underline decoration-red-950/30 underline-offset-4 text-2xl">
                الموضوع: طلب الإذن بتلقي {formData.certificateType || 'شهادة علمية/مثلية'}
              </p>
            </div>

            <div className="space-y-6 text-gray-800 text-2xl leading-[2.5rem]">
              <p className="font-bold">سلام تام بوجود مولانا الإمام،</p>
              <p>
                يشرفنا، بصفتنا العدلين المنتصبين للشهادة بالدائرة المذكورة أعلاه، أن نلتمس من سيادتكم الإذن بتلقي {formData.certificateType || 'شهادة علمية (مثلية)'} لفائدة السيد/السيدة: 
                <span className="font-black text-red-950 mx-2">{formData.involvedNames || '__________________________________'}</span>
              </p>
              <p>
                وتتعلق الشهادة بالموضوع التالي: 
                <span className="font-black text-red-950 mx-2">{formData.reasonForMovement || '__________________________________'}</span>
              </p>
              <p>
                وبعد اطلاعنا على عناصر الشهادة محل الطلب، ومعرفتنا بها، وتحقيقنا من صحة المعطيات المرتبطة بها، والإحاطة بموضوعها من حيث صفة الطالب وصحة المشهود فيه ومشروعية سند الشهادة، واحترام الضوابط المهنية والتنظيمية والتوثيقية الجاري بها العمل؛
              </p>
              <p>
                نتقدم إلى سيادتكم بطلب الإذن لنا وتحت مسؤوليتنا المهنية بتلقي {formData.certificateType || 'الشهادة العلمية'} المذكورة وفق المقتضيات القانونية والتنظيمية الجاري بها العمل في مهنة العدول.
              </p>
              <p className="font-bold text-center mt-8">وتفضلوا بقبول فائق التقدير والاحترام.</p>
            </div>

            {/* Signature Area specifically for Scientific Certificate */}
            <div className="grid grid-cols-2 gap-12 pt-12">
              <div className="space-y-4">
                <p className="font-bold underline">العدل:</p>
                <p className="text-lg">الاسم الكامل: <span className="font-bold">{formData.fullName}</span></p>
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                  التوقيع
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-bold underline">رفيقه:</p>
                <p className="text-lg">الاسم الكامل: <span className="font-bold">{formData.companionAdoulName || '________________'}</span></p>
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                  التوقيع
                </div>
              </div>
            </div>

            <div className="flex justify-start items-end pt-12 border-t mt-12 text-xl">
              <div className="text-right space-y-1">
                <p className="text-gray-600">حرر بـ: <span className="font-bold text-gray-900">{formData.writingPlace || formData.jurisdiction || '__________'}</span> في: <span className="font-bold text-gray-900">{new Date().toLocaleDateString('ar-MA')}</span></p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-r-4 border-red-950 pr-6 py-2">
              <p className="font-bold text-gray-500 text-sm mb-1">من طرف العدل:</p>
              <p className="text-2xl font-black text-gray-900">{formData.fullName || '________________________'}</p>
              <p className="text-gray-700">الرقم المهني: <span className="font-bold">{formData.professionalNumber || formData.appointmentDecreeNumber || '__________'}</span> بتاريخ: <span className="font-bold">{formData.appointmentDate || '__________'}</span></p>
              <p className="text-gray-700">التابع للعمل بدائرة {notaryProfile?.appellate_court || '__________'} قسم التوثيق بـ {formData.jurisdiction || '__________'}</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center shadow-inner">
              <p className="font-bold text-red-950 underline decoration-red-950/30 underline-offset-4">
                الموضوع: إشعار بالتوجه لتلقي إشهاد خارج المحكمة
              </p>
            </div>

            <div className="space-y-6 text-gray-800">
              <p>
                يشرفني أن أحيط سيادتكم علمًا بأنني سأتوجه بتاريخ <span className="underline font-black text-gray-900 px-2 decoration-2">{formData.receptionDate || '//____'}</span>
                على الساعة <span className="underline font-black text-gray-900 px-2 decoration-2">{formData.receptionTime || '____'}</span>
              </p>
              
              <div className="space-y-4">
                 <p className="flex items-start gap-4">
                    <span className="flex-shrink-0 font-bold">إلى العنوان التالي:</span>
                    <span className="underline font-bold text-gray-900 decoration-1 underline-offset-4">{formData.receptionPlace || '______________________________'}</span>
                 </p>

                 <p className="flex flex-col gap-2">
                    <span className="font-bold">من أجل تلقي إشهاد لفائدة الطرف:</span>
                    <span className="bg-white border-2 border-slate-200 p-4 rounded-xl font-black text-2xl text-red-950 shadow-sm leading-normal">
                      {formData.involvedNames || '______________________________'}
                    </span>
                 </p>

                 <p className="flex items-center gap-4">
                    <span className="font-bold">نوع الإشهاد المراد تلقيه:</span>
                    <span className="bg-red-50 px-4 py-1 rounded-lg border border-red-100 font-bold text-red-900">{formData.certificateType || '______________________________'}</span>
                 </p>
              </div>

              <p className="text-gray-700 mt-8 leading-loose">
                وذلك في إطار المهام العدلية المخولة قانونًا وتنفيذًا لطلب الأطراف المعنية.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer of the document - Hidden for Scientific as it has its own */}
      {requestKind !== 'permission_scientific' && requestKind !== 'marriage_permission' && (
        <div className="flex justify-between items-end pt-12 border-t mt-8 text-xl">
          <div className="text-right space-y-1">
            <p className="text-gray-600">حرر بـ: <span className="font-bold text-gray-900">{formData.writingPlace || formData.jurisdiction || '__________'}</span></p>
            <p className="text-gray-600">في: <span className="font-bold text-gray-900">{new Date().toLocaleDateString('ar-MA')}</span></p>
          </div>
          
          <div className="text-center w-72 border-2 border-red-950/20 p-6 rounded-2xl bg-white shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-1 bg-red-950/10"></div>
            <p className="text-gray-400 text-sm mb-8 font-bold tracking-widest group-hover:text-red-950 transition-colors">إمضاء العدل</p>
            <div className="h-16 flex items-center justify-center italic text-3xl font-amiri text-red-950/30 select-none">
              {formData.fullName}
            </div>
            <p className="font-bold text-gray-900 mt-4 border-t pt-2 border-gray-100">{formData.fullName}</p>
          </div>
        </div>
      )}

      {/* Recipient Selection Hook - Added before buttons for visibility */}
      <div className="no-print bg-amber-50/50 p-8 rounded-3xl border-2 border-amber-200 mb-6 mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-xl">🎯</div>
          <h4 className="text-xl font-bold text-amber-900 font-amiri">تحديد جهة الاستلام النهائية:</h4>
        </div>
        
        {requestKind === 'permission_scientific' ? (
          <div className="bg-white border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-right">
                <div className="font-black text-slate-900 flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  قاضي التوثيق
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  هذا النوع من الطلبات يوجه تلقائيًا لقاضي التوثيق.
                </div>
              </div>
              <span className="text-green-700 font-black text-sm bg-green-50 border border-green-200 px-3 py-1 rounded-full">محدد</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setRecipientType('judge')}
              className={`flex items-center justify-between p-5 rounded-2xl font-bold transition-all border-2 ${
                recipientType === 'judge' 
                  ? 'bg-red-950 text-white border-red-950 shadow-lg shadow-red-900/20' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️</span>
                <div className="text-right">
                  <p className="text-lg">قاضي التوثيق</p>
                  <p className={`text-xs ${recipientType === 'judge' ? 'text-red-200' : 'text-gray-400'}`}>توجيه الطلب للسيد القاضي</p>
                </div>
              </div>
              {recipientType === 'judge' && <span className="text-xl">✓</span>}
            </button>
            
            <button
              onClick={() => setRecipientType('regional_council')}
              className={`flex items-center justify-between p-5 rounded-2xl font-bold transition-all border-2 ${
                recipientType === 'regional_council' 
                  ? 'bg-red-900 text-white border-red-900 shadow-lg shadow-red-900/20' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏛️</span>
                <div className="text-right">
                  <p className="text-lg">المجلس الجهوي</p>
                  <p className={`text-xs ${recipientType === 'regional_council' ? 'text-red-200' : 'text-gray-400'}`}>توجيه الطلب للأمانة العامة</p>
                </div>
              </div>
              {recipientType === 'regional_council' && <span className="text-xl">✓</span>}
            </button>

            <button
              onClick={() => setRecipientType('both')}
              className={`flex items-center justify-between p-5 rounded-2xl font-bold transition-all border-2 ${
                recipientType === 'both' 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-900/20' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️🏛️</span>
                <div className="text-right">
                  <p className="text-lg">كلاهما معاً</p>
                  <p className={`text-xs ${recipientType === 'both' ? 'text-slate-200' : 'text-gray-400'}`}>إرسال للقاضي والمجلس</p>
                </div>
              </div>
              {recipientType === 'both' && <span className="text-xl">✓</span>}
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-10 no-print">
        <button
          onClick={handleFinalSend}
          disabled={createNotificationMutation.isPending}
          className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-5 rounded-2xl font-bold text-xl hover:bg-red-900 transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
        >
          {createNotificationMutation.isPending ? (
            <>
              <span className="animate-spin text-2xl">🌀</span>
              جاري معالجة الطلب...
            </>
          ) : (
            <>
              <span>🚀</span>
              تأكيد نهائي وإرسال الإشعار
            </>
          )}
        </button>
        <button
          onClick={() => setShowPreview(false)}
          className="flex-1 px-8 py-5 border-2 border-red-950 text-red-950 rounded-2xl font-bold text-lg hover:bg-red-50 transition-all active:scale-[0.98]"
        >
          ✍️ تعديل البيانات
        </button>
      </div>
    </div>
  );
};

  const getStatusColor = (phase: string) => {
    switch (phase) {
      case 'قيد_المعالجة':
        return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
      case 'قيد_المعالجة_مع_استعلام':
        return 'bg-orange-100 text-orange-800 border-l-4 border-orange-500';
      case 'القرار_النهائي':
        return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
      case 'وثيقة_رسمية':
        return 'bg-purple-100 text-purple-800 border-l-4 border-purple-500';
      case 'مرسل_للعدل':
        return 'bg-green-100 text-green-800 border-l-4 border-green-500';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'قيد_المعالجة':
        return '🔄 قيد المعالجة';
      case 'قيد_المعالجة_مع_استعلام':
        return '❓ قيد المعالجة (استعلام)';
      case 'القرار_النهائي':
        return '⚖️ قيد اتخاذ القرار';
      case 'وثيقة_رسمية':
        return '📄 توليد الوثيقة';
      case 'مرسل_للعدل':
        return '✅ جاهز للاستلام';
      default:
        return phase;
    }
  };

  const cleanDisplayNotes = (notes: string | null | undefined) => {
    if (!notes) return 'لا توجد ملاحظات إضافية مرفقة مع هذا الطلب.';
    let clean = notes;
    
    // Remove metadata blocks
    clean = clean.replace(/--- METADATA START ---\n[\s\S]*?\n--- METADATA END ---/g, '');
    clean = clean.replace(/--- WORKFLOW JSON START ---\n[\s\S]*?\n--- WORKFLOW JSON END ---/g, '');
    
    // Remove repetitive labels if they exist in the text already (common in some templates)
    clean = clean.replace(/^تصنيف الطلب:.*\n?/m, '');
    clean = clean.replace(/^الموضوع:.*\n?/m, '');
    clean = clean.replace(/^الأطراف:.*\n?/m, '');
    
    return clean.trim() || 'تم توثيق الطلب وإرساله بنجاح للمصالح القضائية.';
  };

  const renderDecisionItem = (notif: any) => {
    const isNew = !isDecisionSeen(String(notif.id));
    
    return (
      <div key={notif.id} className={`p-6 hover:bg-gray-50 transition relative ${isNew ? 'bg-blue-50/30' : ''}`}>
        {isNew && (
          <span className="absolute left-6 top-6 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md animate-pulse">
            جديد
          </span>
        )}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">{notif.request_number || notif.requestNumber}</p>
          <p className="text-sm text-gray-600 mt-1">
            {notif.target_court || notif.targetCourt} - {notif.certificate_type || notif.certificateType}
            <span className="mr-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
              الجهة: {notif.recipient_type === 'judge' ? 'القاضي' : 'المجلس الجهوي'}
            </span>
          </p>
        </div>
        <span className={`px-4 py-2 rounded-lg font-semibold text-white whitespace-nowrap ${
          (notif.decision_type || notif.decisionType) === 'موافقة' 
            ? 'bg-green-600' 
            : (notif.decision_type || notif.decisionType) === 'رفض'
            ? 'bg-red-600'
            : 'bg-blue-600'
      }`}>
        {notif.decision_type || notif.decisionType || '⏳ قيد المراجعة'}
      </span>
    </div>

    {(notif.decision_type || notif.decisionType) && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 bg-gray-50 rounded-lg p-4">
        <div>
          <p className="text-xs text-gray-600 font-semibold mb-2">التعليل</p>
          <p className="text-gray-900">{notif.decision_reasoning || notif.decisionReasoning || 'غير محدد'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-semibold mb-2">تاريخ وساعة القرار</p>
          <p className="font-semibold text-gray-900">
            {notif.decided_at ? new Date(notif.decided_at).toLocaleString('ar-MA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : notif.decided_date ? new Date(notif.decided_date).toLocaleDateString('ar-MA') : notif.decidedDate || 'غير محدد'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-semibold mb-2">الوثيقة الرسمية</p>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                markDecisionSeen(String(notif.id));
                setSelectedDecision(notif);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-semibold flex items-center gap-1"
            >
              <span>👁️</span> عرض و تحميل
            </button>
            <button 
              onClick={() => {
                markDecisionSeen(String(notif.id));
                setSelectedDecision(notif);
                setTimeout(() => window.print(), 500);
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition font-semibold flex items-center gap-1"
            >
              <span>🖨️</span> طباعة
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Premium Header with Search */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#fff7ed] via-[#ffedd5] to-white border border-orange-100 p-10 rounded-3xl shadow-xl mb-8 group">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-[800] font-maghribi tracking-tight text-slate-800">بوابة الطلبات المهنية الوطنية</h1>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">نظام التتبع الذكي للطلبات والإشعارات العدلية</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('create')}
                className="bg-red-950 hover:bg-red-900 text-[#E6BE8A] px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span>➕</span>
                إنشاء طلب إشعار
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl relative">
            <div className="relative flex items-center bg-white/50 backdrop-blur-md border border-orange-200 rounded-2xl p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-orange-500/20 transition-all">
              <div className="absolute right-5 text-orange-400 pointer-events-none">
                🔍
              </div>
              <input
                type="text"
                placeholder="ابحث عن رقم الطلب، المحكمة، أو نوع الشهادة..."
                className="w-full bg-transparent text-slate-800 pr-12 pl-6 py-3.5 outline-none placeholder:text-slate-400 text-lg font-amiri"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="ml-3 p-2 hover:bg-orange-50 rounded-lg text-slate-400 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Enhanced */}
      <div className="flex gap-4 border-b border-gray-200 flex-wrap overflow-x-auto pb-px">
        {[
          { id: 'national_requests', label: 'الطلبات المهنية الوطنية', icon: '⚖️' },
          { id: 'create', label: 'طلب جديد', icon: '➕' },
          { id: 'list', label: 'قائمة الطلبات', icon: '📋', badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
          { id: 'notifications_responses', label: 'الاشعارات', icon: '📬', badge: notificationsDecisionsCount },
          { id: 'permissions_responses', label: 'الاذنات', icon: '💍', badge: permissionsDecisionsCount },
          { id: 'archive', label: 'الأرشيف اليدوي', icon: '🗂️' },
          { id: 'dashboard', label: 'لوحة القيادة', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
            }}
            className={`px-6 py-4 font-bold transition-all flex items-center gap-2 border-b-4 -mb-px whitespace-nowrap relative ${
              activeTab === tab.id
                ? 'border-red-950 text-red-950'
                : 'border-transparent text-gray-500 hover:text-red-950 hover:border-red-200'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
            {tab.badge ? (
              <span className="absolute top-2 right-2 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white text-[8px] text-white items-center justify-center font-black">
                  {tab.badge}
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="animate-fadeIn">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-r-4 border-blue-500 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">إجمالي الطلبات</p>
                  <p className="text-4xl font-bold text-blue-900">{statsLoading ? '...' : stats.totalSubmitted}</p>
                </div>
                <span className="text-4xl opacity-20">📊</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border-r-4 border-yellow-500 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium mb-1">قيد المعالجة</p>
                  <p className="text-4xl font-bold text-yellow-900">{listLoading ? '...' : stats.pending}</p>
                </div>
                <span className="text-4xl opacity-20">⏳</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-r-4 border-orange-500 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium mb-1">استعلامات</p>
                  <p className="text-4xl font-bold text-orange-900">{listLoading ? '...' : stats.withInquiry}</p>
                </div>
                <span className="text-4xl opacity-20">❓</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-r-4 border-green-500 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">موافق عليها</p>
                  <p className="text-4xl font-bold text-green-900">{statsLoading ? '...' : stats.approved}</p>
                </div>
                <span className="text-4xl opacity-20">✅</span>
              </div>
            </div>
          </div>

          {/* Recent Requests / Search Results */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-red-950 flex items-center gap-3 font-amiri">
                {searchQuery ? 'نتائج البحث عن الإشعارات' : 'آخر الإشعارات والطلبات'}
              </h2>
              {searchQuery && (
                <span className="text-sm bg-red-50 text-red-700 px-4 py-2 rounded-full font-bold">
                  {filteredNotifications.length} نتيجة مطابقة
                </span>
              )}
            </div>
            
            <div className="p-8">
              {listLoading ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="animate-spin text-4xl mb-4">🌀</div>
                  جاري تحميل البيانات...
                </div>
              ) : filteredNotifications && filteredNotifications.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredNotifications.slice(0, 10).map((notif: any) => {
                    const phaseColor = getStatusColor(notif.status || notif.phase);
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => setSelectedRequestView(notif)}
                        className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:border-red-950/20 hover:translate-x-[-10px] transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center gap-8"
                      >
                        {/* Status Float */}
                        <div className="absolute top-0 left-0">
                           <div className={`px-8 py-3 rounded-br-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg border-b border-r ${phaseColor}`}>
                             {getPhaseLabel(notif.status || notif.phase)}
                           </div>
                        </div>

                        {/* Leading: Icon & Subject */}
                        <div className="flex items-center gap-6 shrink-0 md:w-[300px]">
                           <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl group-hover:bg-red-950 group-hover:text-white transition-all duration-500 shadow-inner">
                              {notif.recipient_type === 'national_council' ? '🏛️' : notif.recipient_type === 'regional_council' ? '⚖️' : '📝'}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 underline decoration-red-900/20 underline-offset-4">طبيعة الإشعار</span>
                              <h3 className="text-xl font-black text-slate-900 font-amiri leading-tight group-hover:text-red-950 transition-colors">
                                 {notif.certificate_type || 'طلب إذن قضائي'}
                              </h3>
                           </div>
                        </div>

                        {/* Middle: Target & Authority */}
                        <div className="flex-1 border-r border-slate-50 pr-8">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">المؤسسة المستقبلة</span>
                           <div className="flex items-center gap-3">
                              <span className="p-2 bg-red-50 text-red-900 rounded-xl text-lg">🏛️</span>
                              <div>
                                 <p className="text-sm font-black text-slate-800 leading-none mb-1">{notif.recipient_type === 'national_council' ? 'الهيئة الوطنية للعدول' : (notif.target_court || notif.jurisdiction)}</p>
                                 <p className="text-[10px] font-bold text-slate-400 italic">{notif.recipient_type === 'judge' ? 'مكتب السيد قاضي التوثيق' : 'قسم المراسلات المؤسساتية'}</p>
                              </div>
                           </div>
                        </div>

                        {/* Trailing: ID & Date */}
                        <div className="flex flex-col items-center justify-center px-10 border-r border-slate-50">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">المرجع الزمني</span>
                           <div className="text-center">
                              <p className="text-sm font-black text-slate-950">{notif.request_number || notif.id.substring(0, 12)}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">{notif.created_at ? new Date(notif.created_at).toLocaleDateString('ar-MA') : 'Archive 2026'}</p>
                           </div>
                        </div>

                        {/* Action Link */}
                        <div className="shrink-0 pl-4">
                           <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2 text-red-950 font-black text-sm group-hover:gap-4 transition-all">
                                 <span>فتح الملف الرقمي</span>
                                 <span className="text-xl">←</span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Click to View Official View</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-20 text-center">
                  <div className="text-6xl mb-6">🏜️</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-2 font-amiri">لا توجد طلبات تطابق معاييرك</h3>
                  <p className="text-gray-500">تأكد من كتابة رقم الطلب أو اسم المحكمة بشكل صحيح</p>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="mt-6 text-red-900 font-bold hover:underline"
                    >
                      عرض جميع الطلبات
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Request Tab */}
      {activeTab === 'create' && (
        <div className="animate-fadeIn">
          {showPreview ? (
            renderTemplatePreview()
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-red-950 flex items-center gap-2">
                  <span>📝</span>
                  {requestKind === 'permission_direction'
                    ? 'طلب إذن بشهادة التوجه'
                    : requestKind === 'permission_scientific'
                      ? 'طلب إذن بتلقي شهادة علمية/مثلية'
                      : 'اختيار نوع الطلب'}
                </h2>
              </div>
              {!requestKind ? (
                <div className="p-6">
                  <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-8">
                    <h3 className="text-lg font-black text-amber-900 mb-2">حدد نوع الطلب</h3>
                    <p className="text-sm text-amber-800 mb-6">قبل تعبئة المعلومات، اختر نوع الإذن المطلوب.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('permission_direction');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-amber-300 bg-white p-6 hover:border-amber-400 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-slate-900">طلب إذن بشهادة التوجه</div>
                            <div className="text-sm text-slate-600 mt-1">نفس الحقول الحالية لطلب التوجه.</div>
                          </div>
                          <div className="text-3xl">🧾</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('permission_scientific');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-amber-300 bg-white p-6 hover:border-amber-400 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-slate-900">طلب إذن بتلقي شهادة علمية/مثلية</div>
                            <div className="text-sm text-slate-600 mt-1">يحتفظ ببيانات العدل ويغيّر تفاصيل الطلب.</div>
                          </div>
                          <div className="text-3xl">📄</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('marriage_permission');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-amber-300 bg-white p-6 hover:border-amber-400 hover:shadow-md transition col-span-1 md:col-span-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-slate-900 font-amiri text-red-900">طلب الاذن بالزواج عبر بوابة العدل</div>
                            <div className="text-sm text-slate-600 mt-1">نظام متكامل لطلبات الزواج مع تتبع إلكتروني وتحقق ذكي.</div>
                          </div>
                          <div className="text-4xl">💍</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('work_certificate_permission');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-blue-300 bg-white p-6 hover:border-blue-400 hover:shadow-md transition col-span-1 md:col-span-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-blue-900">طلب شهادة العمل</div>
                            <div className="text-sm text-slate-600 mt-1">طلب إداري للحصول على شهادة العمل أو مزاولة المهنة.</div>
                          </div>
                          <div className="text-4xl">📄</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('adl_copy_permission');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-red-300 bg-white p-6 hover:border-red-400 hover:shadow-md transition col-span-1 md:col-span-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-red-950 font-amiri underline decoration-red-900/20">طلبات الإذن لاستخراج نسخ/نظائر الرسوم العدلية</div>
                            <div className="text-sm text-slate-600 mt-1">نموذج مرن لاستخراج نسخ أو نظائر الرسوم العدلية الموثقة وتوجيهها آلياً للسيد القاضي.</div>
                          </div>
                          <div className="text-4xl">📜</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestKind('individual_reception_permission');
                          setRecipientType('judge');
                        }}
                        className="text-right rounded-2xl border-2 border-emerald-300 bg-white p-6 hover:border-emerald-400 hover:shadow-md transition col-span-1 md:col-span-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-emerald-950 font-amiri underline decoration-emerald-900/20">طلب الإذن بالتلقي الفردي / غير المتزامن</div>
                            <div className="text-sm text-slate-600 mt-1">نظام ذكي يفرّق بين التلقي الزوجي والفردي ويُنتج طلباً قانونياً متكاملاً.</div>
                          </div>
                          <div className="text-4xl">👤</div>
                        </div>
                      </button>

                      <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-[#1d2569] to-[#2a358c] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-black mb-1">الطلبات المهنية الوطنية ⚖️</h4>
                            <p className="text-xs text-blue-100/80 max-w-md">لطلبات الإعفاء، التوقف، العودة للمهنة، أو التظلمات الوطنية الموجهة للهيئة الوطنية للعدول.</p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('national_requests')}
                            className="bg-white text-[#1d2569] px-6 py-2.5 rounded-xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
                          >
                            فتح بوابة الطلبات الوطنية
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : requestKind === 'marriage_permission' ? (
                <div className="p-6">
                  <MarriagePermissionForm 
                    notaryData={{
                      fullName: formData.fullName,
                      professionalNumber: formData.professionalNumber,
                      officeNumber: formData.officeNumber,
                      jurisdiction: (notaryProfile as any)?.office_address && (notaryProfile as any)?.office_address !== 'غير محدد' && !(notaryProfile as any)?.office_address.includes('تلقائي')
                        ? (notaryProfile as any)?.office_address
                        : (notaryProfile as any)?.primary_court || (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
                      appointmentDecreeNumber: formData.appointmentDecreeNumber,
                      appointmentDate: formData.appointmentDate,
                      appellateCourt: notaryProfile?.appellate_court || '',
                    }}
                    onSubmit={handleMarriageSubmit}
                    onCancel={() => setRequestKind(null)}
                    isSubmitting={isSubmittingMarriage}
                  />
                </div>
              ) : requestKind === 'work_certificate_permission' ? (
                <div className="p-6">
                  <WorkCertificateForm 
                    notaryData={{
                      fullName: (notaryProfile as any)?.full_name_ar || (notaryProfile as any)?.full_name || formData.fullName,
                      fullNameLat: (notaryProfile as any)?.full_name_lat || user?.full_name,
                      professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                      officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber,
                      jurisdiction: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
                      appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
                      appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
                      cin: (notaryProfile as any)?.cin,
                      appellateCourt: (notaryProfile as any)?.appellate_court,
                    }}
                    onSubmit={handleWorkCertSubmit}
                    onCancel={() => setRequestKind(null)}
                    isSubmitting={isSubmittingWorkCert}
                  />
                </div>
              ) : requestKind === 'adl_copy_permission' ? (
                <div className="p-6">
                  <AdlCopyPermissionForm 
                    notaryData={{
                      fullName: (notaryProfile as any)?.full_name_ar || (notaryProfile as any)?.full_name || formData.fullName,
                      professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                      officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber,
                      jurisdiction: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
                      appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
                      appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
                    }}
                    onSubmit={handleAdlCopySubmit}
                    onCancel={() => setRequestKind(null)}
                    isSubmitting={isSubmittingAdlCopy}
                  />
                </div>
              ) : requestKind === 'individual_reception_permission' ? (
                <div className="p-6">
                  <IndividualReceptionPermissionForm 
                    notaryData={{
                      fullName: (notaryProfile as any)?.full_name_ar || (notaryProfile as any)?.full_name || formData.fullName,
                      professionalNumber: (notaryProfile as any)?.professional_number || formData.professionalNumber,
                      officeNumber: (notaryProfile as any)?.office_number || formData.officeNumber,
                      jurisdiction: (notaryProfile as any)?.jurisdiction || formData.jurisdiction,
                      appointmentDecreeNumber: notaryProfile?.appointment_decree_number || formData.appointmentDecreeNumber,
                      appointmentDate: (notaryProfile as any)?.appointment_date || formData.appointmentDate,
                      appellateCourt: (notaryProfile as any)?.appellate_court || notaryProfile?.appellate_court,
                      primaryCourt: (notaryProfile as any)?.primary_court || (notaryProfile as any)?.jurisdiction,
                      officeAddress: (notaryProfile as any)?.office_address && (notaryProfile as any)?.office_address !== 'غير محدد' && !(notaryProfile as any)?.office_address.includes('تلقائي')
                        ? (notaryProfile as any)?.office_address
                        : (notaryProfile as any)?.primary_court || (notaryProfile as any)?.jurisdiction,
                    }}
                    onSubmit={async (data, customRecipient) => {
                      // Unified submission logic
                      try {
                        setIsSubmittingIndividual(true);
                        
                        // Fix for Zod validation error: Ensure all required fields for createNotification are present
                        await createNotificationMutation.mutateAsync({
                          notaryId: user?.id || '',
                          fullName: user?.full_name || 'عدل غير معرف',
                          professionalNumber: (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '0000',
                          officeNumber: (notaryProfile as any)?.office_number || '00',
                          jurisdiction: notaryProfile?.primary_court || (notaryProfile as any)?.jurisdiction || 'غير محدد',
                          targetCourt: notaryProfile?.primary_court || 'المحكمة الابتدائية',
                          certificateType: `إذن بالتلقي الفردي: ${data.certificateType}`,
                          involvedNames: data.partiesNames,
                          receptionPlace: data.receptionLocation,
                          receptionDate: data.receptionDate,
                          reasonForMovement: data.reasons.join(', ') + (data.otherReason ? ' (توضيح: ' + data.otherReason + ')' : ''),
                          requestedDuration: '1', // Default for this request kind
                          durationUnit: 'يوم',     // Default for this request kind
                          notes: `IND-ID: ${data.serialNumber}\n--- DATA JSON START ---\n${JSON.stringify(data)}\n--- DATA JSON END ---`,
                          recipientType: customRecipient || 'judge',
                          appellateCourt: (notaryProfile as any)?.appellate_court,
                          appointmentDecreeNumber: notaryProfile?.appointment_decree_number,
                          appointmentDate: (notaryProfile as any)?.appointment_date,
                        });

                        alert('تم إرسال طلب الإذن بالتلقي الفردي بنجاح.');
                        setRequestKind(null);
                        setActiveTab('list');
                        refetchNotifications();
                      } catch (err: any) {
                        console.error('Submission error:', err);
                        alert('خطأ في الإرسال: ' + (err.message || 'فشل الاتصال بالخادم'));
                      } finally {
                        setIsSubmittingIndividual(false);
                      }
                    }}
                    onCancel={() => setRequestKind(null)}
                    isSubmitting={isSubmittingIndividual}
                  />
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-600">
                    النوع المختار:{' '}
                    <span className="text-slate-900">
                      {requestKind === 'permission_direction' 
                        ? 'طلب إذن بشهادة التوجه' 
                        : requestKind === 'permission_scientific' 
                        ? 'طلب إذن بتلقي شهادة علمية/مثلية'
                        : requestKind === 'work_certificate_permission'
                        ? 'طلب شهادة العمل'
                        : requestKind === 'adl_copy_permission'
                        ? 'طلب استخراج الرسوم العدلية'
                        : 'طلب الإذن بالزواج'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestKind(null);
                      setShowPreview(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
                  >
                    تغيير النوع
                  </button>
                </div>
                {/* Phase 1: Notary Identity */}
                <div>
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                    <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <h3 className="text-lg font-bold text-red-950">بيانات العدل المشرف</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="أدخل اسمك الكامل"
                        className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-blue-50/30 font-bold"
                        required
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الرقم المهني *</label>
                      <input
                        type="text"
                        name="professionalNumber"
                        value={formData.professionalNumber}
                        onChange={handleInputChange}
                        placeholder="مثال: EA-2015-001"
                        className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-blue-50/30 font-bold"
                        required
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التعيين *</label>
                      <input
                        type="date"
                        name="appointmentDate"
                        value={formData.appointmentDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-blue-50/30 font-bold"
                        required
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم المكتب *</label>
                      <input
                        type="text"
                        name="officeNumber"
                        value={formData.officeNumber}
                        onChange={handleInputChange}
                        placeholder="أدخل رقم مكتبك"
                        className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-blue-50/30 font-bold"
                        required
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">محكمة الاستئناف *</label>
                      <input
                        type="text"
                        value={notaryProfile?.appellate_court || 'غير محدد'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الدائرة/الاختصاص (المحكمة الابتدائية) *</label>
                      <input
                        type="text"
                        name="jurisdiction"
                        value={formData.jurisdiction}
                        onChange={handleInputChange}
                        placeholder="المحكمة الابتدائية المعين بها"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-gray-100 font-bold"
                        readOnly
                        required
                      />
                    </div>
              </div>
            </div>
            {requestKind === 'permission_direction' ? (
              <>
                {/* Phase 1: Request Details */}
                <div>
                  <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">تفاصيل الطلب</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">المحكمة/الدائرة القضائية المقصد *</label>
                      <select
                        name="targetCourt"
                        value={formData.targetCourt}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 bg-gray-50 font-bold text-red-900"
                        required
                      >
                        <option value="">اختر المحكمة</option>
                        {notaryProfile?.primary_court && (
                          <option value={notaryProfile.primary_court}>
                            📍 {notaryProfile.primary_court} (محكمتك الأصلية)
                          </option>
                        )}
                        <option value="محكمة تطوان الابتدائية">محكمة تطوان الابتدائية</option>
                        <option value="محكمة الاستئناف">محكمة الاستئناف</option>
                        <option value="محكمة فاس الابتدائية">محكمة فاس الابتدائية</option>
                        <option value="المحكمة العليا">المحكمة العليا</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الشهادة المراد تلقيها *</label>
                      <select
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      >
                        <option value="">اختر النوع</option>
                        <option value="زواج">زواج</option>
                        <option value="طلاق">طلاق</option>
                        <option value="وصية">وصية</option>
                        <option value="إشهادات عقارية">إشهادات عقارية</option>
                        <option value="سماسرة">سماسرة</option>
                        <option value="مالية">مالية</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان تلقي الشهادة (العنوان بالتفصيل) *</label>
                      <input
                        type="text"
                        name="receptionPlace"
                        value={formData.receptionPlace}
                        onChange={handleInputChange}
                        placeholder="مثال: جماعة تمليل، إقليم تطوان"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التلقي *</label>
                        <input
                          type="date"
                          name="receptionDate"
                          value={formData.receptionDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">على الساعة *</label>
                        <input
                          type="time"
                          name="receptionTime"
                          value={formData.receptionTime}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="mt-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان التحرير (المدينة) *</label>
                      <input
                        type="text"
                        name="writingPlace"
                        value={formData.writingPlace}
                        onChange={handleInputChange}
                        placeholder="مثال: تطوان"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">أسماء الأطراف المعنية (يمكن إضافة أكثر من اسم) *</label>
                    <textarea
                      name="involvedNames"
                      value={formData.involvedNames}
                      onChange={handleInputChange}
                      placeholder="أدخل أسماء الأطراف المعنية هنا..."
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">المدة المطلوبة *</label>
                      <input
                        type="number"
                        name="requestedDuration"
                        value={formData.requestedDuration}
                        onChange={handleInputChange}
                        placeholder="1"
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">وحدة الزمن *</label>
                      <select
                        name="durationUnit"
                        value={formData.durationUnit}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      >
                        <option value="ساعة">ساعة</option>
                        <option value="يوم">يوم</option>
                        <option value="تاريخ محدد">تاريخ محدد</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phase 1: Reason and Notes */}
                <div>
                  <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">سبب التوجه والملاحظات</h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">سبب التوجه خارج الاختصاص *</label>
                    <textarea
                      name="reasonForMovement"
                      value={formData.reasonForMovement}
                      onChange={handleInputChange}
                      placeholder="اشرح سبب حاجتك للتوجه خارج اختصاصك..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      required
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات إضافية</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="أي معلومات إضافية مفيدة..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">مرفقات (اختياري)</label>
                    <input
                      type="file"
                      name="attachments"
                      onChange={handleInputChange}
                      multiple
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                    <p className="text-xs text-gray-600 mt-2">الملفات المدعومة: PDF, DOC, DOCX, JPG, PNG</p>
                  </div>
                </div>

                {/* Workflow Information */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700"><strong>سير العمل:</strong></p>
                  <ul className="text-xs text-blue-600 mt-2 space-y-1">
                    <li>✓ عند التقديم: سيتم فحص طلبك من قبل {recipientType === 'judge' ? 'قاضي التوثيق' : 'المجلس الجهوي'}</li>
                    <li>✓ المرحلة 2: قد يطلب المسؤول معلومات إضافية</li>
                    <li>✓ المرحلة 3: يتخذ المسؤول قراره النهائي</li>
                    <li>✓ المرحلة 4: توليد وثيقة رسمية موقعة</li>
                    <li>✓ المرحلة 5: ستتلقى الرد في حسابك الخاص (سري)</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* Phase 1: Scientific/Similar Certificate Permission */}
                <div>
                  <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">تفاصيل طلب الإذن</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الشهادة العلمية *</label>
                      <select
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      >
                        <option value="">اختر النوع</option>
                        <option value="شهادة علمية/مثلية">شهادة علمية/مثلية</option>
                        <option value="شهادة علمية">شهادة علمية</option>
                        <option value="شهادة مثلية">شهادة مثلية</option>
                        <option value="شهادة نسب">شهادة نسب</option>
                        <option value="شهادة وفاة">شهادة وفاة</option>
                        <option value="شهادة حالة">شهادة حالة</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم العدل الرفيق *</label>
                      <input
                        type="text"
                        name="companionAdoulName"
                        value={formData.companionAdoulName}
                        onChange={handleInputChange}
                        placeholder="أدخل اسم العدل الثاني المشارك"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">لفائدة السيد(ة) / الأطراف *</label>
                      <input
                        type="text"
                        name="involvedNames"
                        value={formData.involvedNames}
                        onChange={handleInputChange}
                        placeholder="اسم طالب الإشهاد..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">صفة الطالب *</label>
                      <input
                        type="text"
                        name="applicantCapacity"
                        value={formData.applicantCapacity}
                        onChange={handleInputChange}
                        placeholder="مثال: المعني بالأمر / وكيل / ولي..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">موضوع الشهادة *</label>
                    <textarea
                      name="reasonForMovement"
                      value={formData.reasonForMovement}
                      onChange={handleInputChange}
                      placeholder="اكتب موضوع الشهادة بشكل مفتوح..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      required
                    />
                  </div>

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-slate-700 mb-2">المسؤولية المهنية</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      يتحمل العدل المسؤولية المهنية كاملة عن صحة المعطيات والوثائق المدلى بها، وعن مطابقتها للواقع وللمقتضيات القانونية والتنظيمية الجاري بها العمل.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">أسماء العدلين (تلقائي)</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم العدل الرفيق (اختياري)</label>
                      <input
                        type="text"
                        name="companionAdoulName"
                        value={formData.companionAdoulName}
                        onChange={handleInputChange}
                        placeholder="أدخل اسم الرفيق..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-black text-slate-800 mb-3">مراجع التتبع</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم إشعار</label>
                        <input
                          type="text"
                          name="trackingNotificationNumber"
                          value={formData.trackingNotificationNumber}
                          onChange={handleInputChange}
                          placeholder="اختياري"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم إذن *</label>
                        <input
                          type="text"
                          name="trackingPermissionNumber"
                          value={formData.trackingPermissionNumber}
                          onChange={handleInputChange}
                          placeholder="أدخل رقم الإذن"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ *</label>
                        <input
                          type="date"
                          name="trackingDate"
                          value={formData.trackingDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">ملاحظات ومرفقات</h3>
                  <div className="mt-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات إضافية (اختياري)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="أي معلومات إضافية مفيدة..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">مرفقات (اختياري)</label>
                    <input
                      type="file"
                      name="attachments"
                      onChange={handleInputChange}
                      multiple
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                    <p className="text-xs text-gray-600 mt-2">الملفات المدعومة: PDF, DOC, DOCX, JPG, PNG</p>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700"><strong>سير العمل:</strong></p>
                  <ul className="text-xs text-blue-600 mt-2 space-y-1">
                    <li>✓ عند التقديم: سيتم فحص طلبك من قبل قاضي التوثيق</li>
                    <li>✓ قد يطلب القاضي معلومات إضافية</li>
                    <li>✓ يتخذ القاضي قراره النهائي</li>
                    <li>✓ ستتلقى الرد في حسابك الخاص (سري)</li>
                  </ul>
                </div>
              </>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-red-950 text-[#E6BE8A] rounded-lg hover:bg-red-900 transition font-bold shadow-lg shadow-red-950/20"
              >
                🚀 الخطوة التالية: مراجعة الإشعار
              </button>
              <button
                type="reset"
                className="flex-1 px-6 py-3 border-2 border-red-950 text-red-950 rounded-lg hover:bg-red-50 transition font-semibold"
              >
                🔄 مسح البيانات
              </button>
            </div>
          </form>
              )}
        </div>
      )}
    </div>
  )}

  {/* List Tab */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold text-red-950 flex items-center gap-2">
              <span>📋</span>
              قائمة طلباتي
            </h2>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="بحث برقم الطلب، المحكمة أو الحالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 text-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-red-950 text-[#E6BE8A]">
                <tr>
                  <th className="px-6 py-4 font-black">رقم الطلب</th>
                  <th className="px-6 py-4 font-black">المحكمة</th>
                  <th className="px-6 py-4 font-black">نوع الشهادة</th>
                  <th className="px-6 py-4 font-black">تاريخ ووقت الإرسال</th>
                  <th className="px-6 py-4 font-black">المرحلة</th>
                  <th className="px-6 py-4 font-black">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">جاري تحميل البيانات...</td>
                  </tr>
                ) : filteredNotifications && filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif: any) => (
                    <tr key={notif.id} className="hover:bg-gray-50 transition border-b border-gray-50">
                      <td className="px-6 py-4 font-black text-gray-900">{notif.request_number || notif.id}</td>
                      <td className="px-6 py-4 text-gray-700 font-bold">{notif.target_court || notif.jurisdiction || 'غير محدد'}</td>
                      <td className="px-6 py-4 text-gray-700 font-bold">{notif.certificate_type || 'غير محدد'}</td>
                      <td className="px-6 py-4 text-gray-700 font-black text-xs">
                        {notif.created_at ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="flex items-center gap-1.5 text-gray-900 font-black text-xs italic">
                              <span className="opacity-50">📅</span>
                              {new Date(notif.created_at).toLocaleDateString('ar-MA')}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                              <span className="opacity-50">🕒</span>
                              {new Date(notif.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : 'غير محدد'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black inline-block whitespace-nowrap shadow-sm border ${getStatusColor(notif.status || notif.phase)}`}>
                          {getPhaseLabel(notif.status || notif.phase)}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button 
                          onClick={() => setSelectedRequestView(notif)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-[11px] font-black flex items-center gap-1 border border-blue-100"
                        >
                          👁️ تفاصيل
                        </button>
                        <button 
                          onClick={() => setSelectedTrackingView(notif)}
                          className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition text-[11px] font-black flex items-center gap-1 border border-orange-100"
                        >
                          📍 تتبع
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">لا توجد طلبات تطابق بحثك</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications Responses Tab */}
      {activeTab === 'notifications_responses' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-fadeIn">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-red-950 flex items-center gap-2">
              <span>📬</span>
              الاشعارات - التتبع والقرارات
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">(خاص بك فقط)</span>
            </h2>
            <div className="text-xs text-gray-500 font-bold">
              إجمالي الطلبات: {notificationsRequests.length}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {listLoading ? (
              <div className="p-6 text-center text-gray-500">جاري تحميل البيانات...</div>
            ) : notificationsRequests && notificationsRequests.length > 0 ? (
              notificationsRequests.map((notif: any) => {
                // If it has a decision, render the decision item
                if (notif.decision_type || notif.decisionType) {
                  return renderDecisionItem(notif);
                }
                // Otherwise, render a "pending" simplified item
                return (
                  <div key={notif.id} className="p-6 hover:bg-gray-50 transition border-r-4 border-blue-400">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{notif.request_number || notif.requestNumber}</p>
                        <p className="text-sm text-gray-600">
                          {notif.target_court || notif.targetCourt} - {notif.certificate_type || notif.certificateType}
                        </p>
                        <p className="text-xs text-blue-600 mt-2 font-bold flex items-center gap-1">
                          <span>⏳</span> قيد المعالجة من طرف: {notif.recipient_type === 'judge' ? 'قاضي التوثيق' : 'المجلس الجهوي'}
                        </p>
                      </div>
                      <button 
                         onClick={() => setSelectedRequestView(notif)}
                         className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
                      >
                        👁️ عرض الطلب
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">📬</div>
                <p className="text-lg font-bold text-gray-800 mb-2">لا توجد إشعارات حالياً</p>
                <p className="text-sm text-gray-600">سيتم عرض طلباتك وردودها هنا بمجرد إرسالها.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permissions Responses Tab */}
      {activeTab === 'permissions_responses' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-fadeIn">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-red-950 flex items-center gap-2">
              <span>💍</span>
              الاذنات - التتبع والقرارات
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">(خاص بك فقط)</span>
            </h2>
            <div className="text-xs text-gray-500 font-bold">
              إجمالي الطلبات: {permissionsRequests.length}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {listLoading ? (
              <div className="p-6 text-center text-gray-500">جاري تحميل البيانات...</div>
            ) : permissionsRequests && permissionsRequests.length > 0 ? (
              permissionsRequests.map((notif: any) => {
                if (notif.decision_type || notif.decisionType) {
                  return renderDecisionItem(notif);
                }
                return (
                  <div key={notif.id} className="p-6 hover:bg-gray-50 transition border-r-4 border-emerald-400">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{notif.request_number || notif.requestNumber}</p>
                        <p className="text-sm text-gray-600">
                          {notif.target_court || notif.targetCourt} - {notif.certificate_type || notif.certificateType}
                        </p>
                        <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
                          <span>⏳</span> في مرحلة الدراسة والتحقق
                        </p>
                      </div>
                      <button 
                         onClick={() => setSelectedRequestView(notif)}
                         className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
                      >
                        👁️ عرض الطلب
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">💍</div>
                <p className="text-lg font-bold text-gray-800 mb-2">لا توجد أذونات حالياً</p>
                <p className="text-sm text-gray-600">تواصل مع قسم الزواج أو القاضي لمتابعة أذوناتك.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* National Requests Tab (Integrated from NationalRequestsManagement) */}
      {activeTab === 'national_requests' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-fadeIn">
          <NationalRequestsManagement />
        </div>
      )}

      {/* Request View Modal */}
      {selectedRequestView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print overflow-y-auto">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col my-10 animate-fadeIn">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-xl font-black text-red-950 font-amiri">عرض تفاصيل الطلب رقم: {selectedRequestView.request_number}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <span>📅</span>
                      الإرسال: {new Date(selectedRequestView.created_at).toLocaleDateString('ar-MA')}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 border-r border-slate-200 pr-4">
                      <span>🕒</span>
                      الساعة: {new Date(selectedRequestView.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequestView(null)}
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-gray-100/30 custom-scrollbar">
              {/* 🛰️ Premium Progress Mapping - Digital Workflow Tracker */}
              <div className="max-w-4xl mx-auto mb-10 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 no-print">
                <div className="flex justify-between items-start relative px-10">
                  {/* Digital Pulse Background Line */}
                  <div className="absolute top-7 left-20 right-20 h-0.5 bg-slate-100 z-0"></div>
                  
                  {(() => {
                    const status = selectedRequestView.status;
                    const recipient = selectedRequestView.recipient_type === 'judge' ? 'قاضي التوثيق' : 'المجلس الجهوي';
                    
                    const steps = [
                      { id: 1, label: 'إيداع الطلب', sub: 'العدل الموثق', icon: '📤', done: true, current: false },
                      { id: 2, label: 'وصول الطلب', sub: recipient, icon: '🏛️', done: !!status, current: status === 'قيد_المعالجة' },
                      { id: 3, label: 'دراسة الملف', sub: 'المصالح المختصة', icon: '🔍', done: ['موافق_عليه', 'مرفوض', 'مؤجل', 'محفوظ_دون_أثر'].includes(status), current: status === 'قيد_الدراسة' || status === 'القرار_النهائي' },
                      { id: 4, label: 'القرار النهائي', sub: ['موافق_عليه', 'مرفوض'].includes(status) ? 'تم البت' : 'قيد الانتظار', icon: '⚖️', done: ['موافق_عليه', 'مرفوض', 'محفوظ_دون_أثر'].includes(status), current: false },
                    ];

                    const completedCount = steps.filter(s => s.done).length;
                    const progressWidth = `${((completedCount - 1) / (steps.length - 1)) * 100}%`;

                    return (
                      <>
                        <div 
                          className="absolute top-7 left-20 h-0.5 bg-red-950 z-0 transition-all duration-1000 shadow-[0_0_10px_rgba(69,10,10,0.3)]"
                          style={{ width: progressWidth, right: 'auto' }}
                        ></div>

                        {steps.map((step, idx) => (
                          <div key={idx} className="relative z-10 flex flex-col items-center gap-3 w-32">
                            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl transition-all duration-500 shadow-lg ${
                              step.done 
                              ? 'bg-red-950 border-red-900 text-[#E6BE8A] scale-110' 
                              : step.current
                                ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
                                : 'bg-white border-slate-100 text-slate-300'
                            }`}>
                              {step.icon}
                              {step.done && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">✓</span>
                              )}
                            </div>
                            <div className="text-center">
                              <p className={`text-[11px] font-black uppercase tracking-widest leading-none ${step.done ? 'text-red-950' : 'text-slate-400'}`}>{step.label}</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-1.5 opacity-60">{step.sub}</p>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedRequestView.certificate_type?.includes('زواج') ? (
                <div className="mx-auto max-w-4xl">
                   <MarriageDocumentView 
                     data={parseMarriageNotes(selectedRequestView.notes) || {}} 
                     notaryData={{
                       fullName: selectedRequestView.notary_name,
                       jurisdiction: selectedRequestView.jurisdiction,
                       professionalNumber: selectedRequestView.notary_professional_number
                     }}
                   />
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 p-12 max-w-4xl mx-auto space-y-12 font-amiri relative overflow-hidden">
                   {/* Sovereignty Watermark */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-red-950/5 rounded-bl-[5rem] -translate-y-10 translate-x-10"></div>
                   
                   <div className="text-center space-y-4 border-b border-slate-100 pb-10">
                    <div className="inline-block px-8 py-2 bg-red-950 text-[#E6BE8A] rounded-full text-xs font-black mb-4 shadow-lg shadow-red-950/20 uppercase tracking-widest">
                      Official Judicial Correspondence
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">
                      إشعار موجه إلى {selectedRequestView.recipient_type === 'judge' ? 'السيد قاضي التوثيق' : 'السيد رئيس المجلس الجهوي'}
                    </h2>
                    <p className="text-2xl font-black text-red-950 mt-4 opacity-80">
                      بدرجة: {selectedRequestView.jurisdiction}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-right" dir="rtl">
                    {/* Source Info */}
                    <div className="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 relative group overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-950 opacity-20 transition-all group-hover:opacity-100"></div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">🤵</div>
                        <p className="font-black text-slate-400 text-xs uppercase tracking-widest">مصدر الإشعار</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-black text-slate-900">{selectedRequestView.notary_name}</p>
                        <p className="text-slate-600 font-bold">الرقم المهني: <span className="text-red-950 font-black">{selectedRequestView.notary_professional_number && selectedRequestView.notary_professional_number !== '0000' ? selectedRequestView.notary_professional_number : ((notaryProfile as any)?.professional_number || '---')}</span></p>
                        <p className="text-slate-500 font-medium">بدائرة نفوذ {selectedRequestView.jurisdiction && selectedRequestView.jurisdiction !== 'Unknown' ? selectedRequestView.jurisdiction : (notaryProfile?.primary_court || '---')}</p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-6 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-red-50 text-red-900 rounded-2xl flex items-center justify-center text-xl shadow-sm">📋</div>
                        <p className="font-black text-slate-400 text-xs uppercase tracking-widest">تفاصيل الموضوع</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                          <span className="text-slate-400 font-bold text-sm">طبيعة الطلب</span>
                          <span className="text-slate-900 font-black">{selectedRequestView.certificate_type}</span>
                        </div>
                        {selectedRequestView.notes?.includes('--- METADATA START ---') && (
                          <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                            <span className="text-slate-400 font-bold text-sm">تصنيف المسطرة</span>
                            <span className="text-red-900 font-black bg-red-50 px-3 py-1 rounded-lg text-xs">
                              {(() => {
                                try {
                                  const metaPart = selectedRequestView.notes.split('--- METADATA START ---')[1].split('--- METADATA END ---')[0];
                                  const meta = JSON.parse(metaPart);
                                  const categoryMap: any = { 'ADM': 'إداري', 'REG': 'تنظيمي', 'PRO': 'مهني', 'ELEC': 'انتخابي', 'A': 'إداري (نموذج أ)' };
                                  return categoryMap[meta.category] || meta.category;
                                } catch { return 'عام'; }
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                          <span className="text-slate-400 font-bold text-sm">تاريخ التلقي المرتقب</span>
                          <span className="text-slate-900 font-black">{selectedRequestView.reception_date || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center uppercase">
                          <span className="text-slate-400 font-bold text-sm">ساعة الموعد</span>
                          <span className="text-slate-900 font-black">{selectedRequestView.reception_time || '---'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-6 p-8 bg-slate-950 text-white rounded-[2.5rem] shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-900/20 rounded-full blur-3xl group-hover:bg-red-900/40 transition-all duration-700"></div>
                      <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
                         <div className="flex-1 space-y-4">
                            <p className="text-[#E6BE8A] text-xs font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
                              <span className="w-8 h-[1px] bg-red-900"></span>
                              تفاصيل الأطراف والسبب
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className="text-slate-400 text-[10px] uppercase font-black">الأطراف المعنية</label>
                                  <p className="text-lg font-bold leading-relaxed">
                                    {selectedRequestView.involved_names || (() => {
                                      const match = selectedRequestView.notes?.match(/الأطراف:\s*(.*)/);
                                      return match ? match[1] : 'لم يتم تحديد الأطراف';
                                    })()}
                                  </p>
                               </div>
                               <div>
                                  <label className="text-slate-400 text-[10px] uppercase font-black">مكان التلقي / التوجه</label>
                                  <p className="text-lg font-bold leading-relaxed">{selectedRequestView.reception_place || 'مقر المحكمة'}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">ملاحظات إضافية مرسلة</p>
                       <p className="text-slate-700 font-bold leading-loose text-lg whitespace-pre-wrap">{cleanDisplayNotes(selectedRequestView.notes)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex gap-4 no-print shrink-0">
               <button 
                 onClick={() => window.print()}
                 className="flex-1 bg-red-950 text-[#E6BE8A] py-3 rounded-xl font-bold hover:bg-red-900 flex items-center justify-center gap-2"
               >
                 <span>🖨️</span> طباعة الطلب
               </button>
               <button 
                 onClick={() => setSelectedRequestView(null)}
                 className="flex-1 bg-white text-gray-600 border border-gray-200 py-3 rounded-xl font-bold hover:bg-gray-50"
               >
                 إغلاق
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Document Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-black text-red-950 font-amiri">
                {isPermissionDecision(selectedDecision) && selectedDecision.decision_type === 'موافقة' 
                  ? (selectedDecision.certificate_type?.includes('شهادة العمل') ? 'شهادة العمل الرسمية' : 'إذن بتوثيق عقد الزواج') 
                  : 'مراجعة القرار الرسمي'}
              </h2>
              <button 
                onClick={() => setSelectedDecision(null)}
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                title="إغلاق"
              >
                ✕
              </button>
            </div>
             
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-100/30">
              {parsedAdlData ? (
                <div id="printable-decision" className="bg-white rounded-[2rem] p-4 md:p-8 shadow-sm print:p-0">
                   <AdlCopyDocumentView 
                      data={parsedAdlData} 
                      notaryData={{
                        fullName: selectedDecision.notary_name,
                        jurisdiction: selectedDecision.jurisdiction,
                        professionalNumber: selectedDecision.notary_professional_number
                      }} 
                      annotation={{
                        status: selectedDecision.decision_type === 'موافقة' ? 'approved' : 'rejected',
                        reasoning: selectedDecision.decision_reasoning,
                        date: new Date(selectedDecision.decided_at || new Date()).toLocaleDateString('ar-MA'),
                        regNumber: selectedDecision.request_number || 'REQ-XXXX',
                        judgeName: 'قاضي التوثيق'
                      }}
                   />
                </div>
              ) : isPermissionDecision(selectedDecision) && (selectedDecision.decision_type || selectedDecision.decisionType) ? (
                <div className="bg-slate-500 p-4 md:p-8 rounded-2xl">
                  {selectedDecision.certificate_type?.includes('شهادة العمل') ? (
                    <WorkCertificateApprovalTemplate notification={selectedDecision} documentId="printable-decision" />
                  ) : (selectedDecision.certificate_type === 'INDIVIDUAL_RECEPTION' || selectedDecision.certificate_type?.includes('تلقي')) ? (
                    <IndividualReceptionDocumentTemplate notification={selectedDecision} documentId="printable-decision" />
                  ) : (
                    <MarriagePermissionApprovalTemplate notification={selectedDecision} documentId="printable-decision" />
                  )}
                </div>
              ) : (
              <div id="printable-decision" className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12 max-w-2xl mx-auto space-y-10 min-h-[842px] relative print:shadow-none print:border-none print:p-0">
                {/* Common Header */}
                <div className="flex justify-between items-start mb-10 text-center">
                  <div className="w-1/3 text-right">
                    <p className="font-bold text-lg font-maghribi">المملكة المغربية</p>
                    <p className="font-bold text-lg font-maghribi">وزارة العدل</p>
                    {selectedDecision.recipient_type === 'judge' ? (
                      <>
                        <p className="font-bold text-lg">{selectedDecision.jurisdiction || '........'}</p>
                        <p className="font-bold text-sm text-slate-500">مكتب السيد قاضي التوثيق</p>
                      </>
                    ) : (
                      <p className="font-bold text-lg">المجلس الجهوي لعدول استئنافية {selectedDecision.appellate_court ? `محكمة الاستئناف ب${selectedDecision.appellate_court}` : (selectedDecision.jurisdiction || '........')}</p>
                    )}
                  </div>
                  <div className="w-1/3 flex flex-col items-center">
                    <img 
                      src={selectedDecision.recipient_type === 'judge' ? "/logos/morocco-coat.jpg" : "/logos/adoul-logo.jpg"} 
                      alt="Logo" 
                      className="w-28 h-28 object-contain mb-2" 
                    />
                  </div>
                  <div className="w-1/3 text-left">
                    <p className="font-bold text-lg">تحرير بـ: {selectedDecision.writing_place || selectedDecision.jurisdiction || '........'}</p>
                    <p className="font-bold text-lg">بتاريخ: {new Date(selectedDecision.decided_at || new Date()).toLocaleDateString('ar-MA')}</p>
                  </div>
                </div>

                {/* Title based on Decision Type */}
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-black border-b-4 border-double border-red-950 inline-block pb-2 font-maghribi">
                    {selectedDecision.decision_type === 'موافقة' ? 'إشعار بالموافقة' : (selectedDecision.decision_type === 'رفض' ? 'إشعار بالرفض' : 'إشعار بالقرار الرسمي')}
                  </h1>
                </div>

                {/* Dynamic Content based on Decision Type */}
                <div className="text-right leading-[2.2] text-xl space-y-6 px-10">
                  {selectedDecision.decision_type === 'موافقة' && (
                    <div className="space-y-6">
                      <div className="mb-4">
                        <p className="font-bold">إلى السيد العدل: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.notary_name}</span></p>
                        <p className="mt-2">الرقم المهني: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.professionalNumber || selectedDecision.appointment_decree_number || '........'}</span> بتاريخ: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.appointment_date || '........'}</span></p>
                      </div>
                      
                      <p className="font-bold text-center underline decoration-double underline-offset-8 decoration-red-950/30">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                      
                      <p className="text-center font-bold text-3xl mt-8">سلام تام بوجود مولانا الإمام،</p>
                      
                      <p className="font-bold text-2xl">وبعد،</p>
                      
                      <p className="text-justify px-4">
                        فقد توصل {selectedDecision.recipient_type === 'judge' ? 'هذا المكتب' : 'المجلس الجهوي'} بإشعاركم المؤرخ في <span className="font-bold underline decoration-slate-400">{selectedDecision.created_at ? new Date(selectedDecision.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_date || '........'}</span> على الساعة <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_time || '........'}</span> إلى العنوان: <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: السيد/السيدة <span className="font-bold underline decoration-slate-400">{selectedDecision.involved_names || '........'}</span>، والنوع: <span className="font-bold underline decoration-slate-400">{selectedDecision.certificate_type || '........'}</span>.
                      </p>
                      
                      <p className="px-4">
                        وبعد الاطلاع على مضمون الإشعار والتأكد من طابعه المهني وملاءمته لمهامكم العدلية، يخبركم {selectedDecision.recipient_type === 'judge' ? 'السيد قاضي التوثيق' : 'المجلس الجهوي'} بما يلي:
                      </p>
                      
                      <div className="relative py-8 px-10 bg-slate-50 border-l-8 border-red-950 rounded-r-2xl shadow-inner mx-4">
                        <p className="font-black text-3xl leading-relaxed text-red-950">
                          لا مانع لدى {selectedDecision.recipient_type === 'judge' ? 'هذا المكتب' : 'المجلس الجهوي'} من تنفيذ ما تضمنه إشعاركم المذكور، مع تسجيل العملية في السجلات المهنية المعتمدة عند الاقتضاء.
                        </p>
                      </div>
                      
                      <p className="text-center font-bold text-2xl mt-12">وتفضلوا بقبول fائق التقدير والاحترام.</p>
                      
                      <div className="mt-16 flex flex-col items-start gap-2">
                        {selectedDecision.recipient_type === 'judge' ? (
                          <p className="font-bold text-xl">قاضي التوثيق بـ: <span className="underline decoration-red-950/20 underline-offset-8">{selectedDecision.jurisdiction || '........'}</span></p>
                        ) : (
                          <p className="font-bold text-xl">عن رئيس المجلس الجهوي للعدول بجهة: <span className="underline decoration-red-950/20 underline-offset-8">محكمة الاستئناف ب{selectedDecision.appellate_court || '........'}</span></p>
                        )}
                        <p className="font-bold text-lg text-slate-500 italic mt-4">الإمضاء والخاتم</p>
                        <p className="font-bold">حرر بتاريخ: <span className="underline decoration-slate-300 font-mono">{new Date(selectedDecision.decided_at || new Date()).toLocaleDateString('ar-MA')}</span></p>
                      </div>
                    </div>
                  )}

                  {selectedDecision.decision_type === 'رفض' && (
                    <div className="space-y-6">
                      <div className="mb-4">
                        <p className="font-bold">إلى السيد العدل: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.notary_name}</span></p>
                        <p className="mt-2">الرقم المهني: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.professional_number || selectedDecision.appointment_decree_number || '........'}</span></p>
                      </div>
                      
                      <p className="font-bold text-center underline decoration-double underline-offset-8 decoration-red-950/30">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                      
                      <p className="text-center font-bold text-3xl mt-8">سلام تام بوجود مولانا الإمام،</p>
                      
                      <p className="font-bold text-2xl">وبعد،</p>
                      
                      <p className="text-justify px-4">
                        فقد توصل المجلس الجهوي بإشعاركم المؤرخ في <span className="font-bold underline decoration-slate-400">{selectedDecision.created_at ? new Date(selectedDecision.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_date || '........'}</span> إلى العنوان: <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: <span className="font-bold underline decoration-slate-400">{selectedDecision.involved_names || '........'}</span> وبنوع الإشهاد: <span className="font-bold underline decoration-slate-400">{selectedDecision.certificate_type || '........'}</span>.
                      </p>
                      
                      <p className="px-4">
                        وبعد الاطلاع على مضمون الإشعار ودراسته في ضوء المقتضيات التنظيمية والمهنية الجاري بها العمل، يؤسفنا إخباركم بأن المجلس الجهوي يتعذر عليه الموافقة على تنفيذ مضمون الإشعار المذكور لعدم استيفائه للشروط التنظيمية الواجبة، ويُعتبر الطلب غير مقبول من الناحية المهنية.
                      </p>
                      
                      <div className="relative py-8 px-10 bg-red-50 border-l-8 border-red-700 rounded-r-2xl shadow-inner mx-4">
                        <p className="font-black text-3xl leading-relaxed text-red-800">
                          وعليه، يُصرف النظر عن الإشعار مع تسجيله في السجلات المهنية المعتمدة دون ترتيب أثر.
                        </p>
                      </div>

                      {selectedDecision.decision_reasoning && (
                        <div className="mt-8 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mx-4">
                          <p className="text-sm text-slate-400 font-bold mb-2">📄 تعليل إضافي من المجلس:</p>
                          <p className="italic text-slate-700 text-lg leading-loose">{selectedDecision.decision_reasoning}</p>
                        </div>
                      )}
                      
                      <p className="text-center font-bold text-2xl mt-12">وتفضلوا بقبول فائق التقدير والاحترام.</p>
                      
                      <div className="mt-16 flex flex-col items-start gap-2">
                        <p className="font-bold text-xl">عن رئيس المجلس الجهوي للعدول بجهة: <span className="underline decoration-red-950/20 underline-offset-8">محكمة الاستئناف ب{selectedDecision.appellate_court || '........'}</span></p>
                        <p className="font-bold text-lg text-slate-500 italic mt-4">الإمضاء والخاتم</p>
                        <p className="font-bold">حرر بتاريخ: <span className="underline decoration-slate-300 font-mono">{new Date(selectedDecision.decided_at || new Date()).toLocaleDateString('ar-MA')}</span></p>
                      </div>
                    </div>
                  )}

                  {(selectedDecision.decision_type !== 'موافقة' && selectedDecision.decision_type !== 'رفض') && (
                    <div className="space-y-6">
                      <div className="mb-4">
                        <p className="font-bold">إلى السيد العدل: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.notary_name}</span></p>
                        <p className="mt-2">الرقم المهني: <span className="underline decoration-slate-300 decoration-1 underline-offset-8">{selectedDecision.professional_number || selectedDecision.appointment_decree_number || '........'}</span></p>
                      </div>
                      
                      <p className="font-bold text-center underline decoration-double underline-offset-8 decoration-red-950/30">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                      
                      <p className="text-center font-bold text-3xl mt-8">سلام تام بوجود مولانا الإمام،</p>
                      
                      <p className="font-bold text-2xl">وبعد،</p>
                      
                      <p className="text-justify px-4">
                        فقد توصل المجلس الجهوي بإشعاركم المؤرخ في <span className="font-bold underline decoration-slate-400">{selectedDecision.created_at ? new Date(selectedDecision.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_date || '........'}</span> على الساعة <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_time || '........'}</span> إلى العنوان: <span className="font-bold underline decoration-slate-400">{selectedDecision.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: <span className="font-bold underline decoration-slate-400">{selectedDecision.involved_names || '........'}</span> وبنوع الإشهاد: <span className="font-bold underline decoration-slate-400">{selectedDecision.certificate_type || '........'}</span>.
                      </p>
                      
                      <p className="px-4">
                        وبعد الاطلاع على الإشعار المذكور ودراسته في ضوء المقتضيات المهنية والتنظيمية المتعلقة بمزاولة مهام التوثيق العدلي، يُفيدكم المجلس الجهوي بأن البتّ في موضوع الإشعار قد تقرر تأجيله إلى حين استيفاء الإجراءات المهنية الجاري بها العمل، مع الاحتفاظ بسائر الحقوق المهنية والتنظيمية.
                      </p>

                      <div className="relative py-8 px-10 bg-blue-50 border-l-8 border-blue-900 rounded-r-2xl shadow-inner mx-4">
                        <p className="font-black text-3xl leading-relaxed text-blue-900 text-center">
                          وعليه، يُرجى عدم ترتيب أي أثر على الإشعار المذكور إلى حين إشعاركم بخلاف ذلك.
                        </p>
                      </div>
                      
                      {selectedDecision.decision_reasoning && (
                        <div className="mt-8 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mx-4">
                          <p className="text-sm text-slate-400 font-bold mb-2">📄 ملاحظات إضافية من المجلس:</p>
                          <p className="italic text-slate-700 text-lg leading-loose">{selectedDecision.decision_reasoning}</p>
                        </div>
                      )}

                      <p className="text-center font-bold text-2xl mt-12">وتفضلوا بقبول فائق التقدير والاحترام.</p>
                      
                      <div className="mt-16 flex flex-col items-start gap-2">
                        <p className="font-bold text-xl">عن رئيس المجلس الجهوي للعدول بجهة: <span className="underline decoration-red-950/20 underline-offset-8">محكمة الاستئناف ب{selectedDecision.appellate_court || '........'}</span></p>
                        <p className="font-bold text-lg text-slate-500 italic mt-4">الإمضاء والخاتم</p>
                        <p className="font-bold">حرر بتاريخ: <span className="underline decoration-slate-300 font-mono">{new Date(selectedDecision.decided_at || new Date()).toLocaleDateString('ar-MA')}</span></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer fixed only for print */}
                <div className="pt-12 mt-12 border-t text-center text-xs text-gray-400">
                   هذه الوثيقة مستخرجة آلياً من النظام الذكي للتدبير الرقمي للرسوم العدلية وتعتبر بمثابة إشعار رسمي للهيئة الوطنية للعدول بالمغرب.
                </div>
              </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex gap-4 no-print">
               <button 
                 onClick={handleDecisionPrint}
                 className="flex-1 bg-red-950 text-[#E6BE8A] py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl shadow-red-950/20 flex items-center justify-center gap-3"
                >
                  <span>🖨️</span> {isPermissionDecision(selectedDecision) && selectedDecision.decision_type === 'موافقة' ? 'طباعة الإذن / تحميل PDF' : 'طباعة القرار / تحميل PDF'}
                </button>
               <button 
                 onClick={() => setSelectedDecision(null)}
                 className="px-8 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-50 transition"
               >
                 إغلاق
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between flex-row-reverse">
            <h2 className="text-2xl font-black text-[#5a0c0b] flex items-center gap-3 font-amiri">
              الأرشيف الشخصي
              <span className="text-2xl">📂</span>
            </h2>
          </div>
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center mb-8 relative">
              <span className="text-7xl">📂</span>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100">
                <span className="text-xl">✨</span>
              </div>
            </div>
            <p className="text-gray-600 mb-8 text-xl font-bold font-amiri max-w-sm">
              لم تقم بأرشفة أي طلبات حتى الآن
            </p>
            <button 
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-4 px-12 py-5 bg-[#3b0d0c] text-white rounded-2xl hover:bg-[#2d0a09] transition-all transform active:scale-95 shadow-xl font-black text-lg group"
            >
              <span>أرشفة الطلبات</span>
              <span className="text-2xl transition-transform group-hover:scale-125">➕</span>
            </button>
          </div>
        </div>
      )}

      {/* Tracking View Modal */}
      {selectedTrackingView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-slate-100 font-amiri" dir="rtl">
            {/* Header with Background Pattern */}
            <div className="bg-gradient-to-br from-red-950 to-[#3b0d0c] p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-20 -mt-20"></div>
               <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#E6BE8A]/10 rounded-full -mr-10 -mb-10"></div>
               
               <button 
                onClick={() => setSelectedTrackingView(null)} 
                className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/80 hover:text-white"
               >
                 ✕
               </button>

               <div className="relative">
                 <div className="inline-block px-4 py-1.5 bg-[#E6BE8A] text-[#3b0d0c] rounded-full text-xs font-black mb-4 shadow-lg pr-6 pl-6">
                    نظام التتبع الذكي
                 </div>
                 <h3 className="text-3xl font-black mb-2 flex items-center gap-4">
                  <span className="p-3 bg-white/10 rounded-2xl shadow-inner italic">📍</span>
                  تتبع مسار ملفكم
                 </h3>
                 <div className="mt-4 flex flex-col gap-1">
                   <p className="text-white/60 font-bold flex items-center gap-2">
                     <span className="w-2 h-2 bg-[#E6BE8A] rounded-full animate-pulse"></span>
                     الرقم المرجعي: <span className="text-[#E6BE8A]">{selectedTrackingView.request_number || selectedTrackingView.id}</span>
                   </p>
                   <p className="text-white/60 font-bold text-xs flex items-center gap-3">
                     <span className="flex items-center gap-1.5 opacity-80 italic">
                        <span className="text-[#E6BE8A]">📅</span>
                        تاريخ الإيداع: <span className="text-[#E6BE8A]">{new Date(selectedTrackingView.created_at).toLocaleDateString('ar-MA')}</span>
                     </span>
                     <span className="flex items-center gap-1.5 opacity-80 border-r border-white/10 pr-3 italic">
                        <span className="text-[#E6BE8A]">🕒</span>
                        ساعة الإيداع: <span className="text-[#E6BE8A]">{new Date(selectedTrackingView.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                     </span>
                   </p>
                 </div>
               </div>
            </div>

            <div className="p-10 md:p-14 bg-slate-50/50">
              <div className="relative">
                {/* Graphical Line Background */}
                <div className="absolute right-[19px] top-2 bottom-2 w-1 bg-slate-200 rounded-full overflow-hidden">
                   <div 
                    className="w-full bg-gradient-to-b from-[#E6BE8A] via-red-900 to-red-950 transition-all duration-1000"
                    style={{ 
                      height: (selectedTrackingView.decision_type || selectedTrackingView.decisionType) ? '100%' : 
                              (selectedTrackingView.status === 'قيد_المعالجة' || selectedTrackingView.phase === 'قيد_المعالجة') ? '50%' : '25%' 
                    }}
                   />
                </div>

                <div className="space-y-10">
                  <PortalTrackingStep 
                    title="إيداع الطلب إلكترونياً" 
                    date={selectedTrackingView.created_at || selectedTrackingView.submissionDate} 
                    status="completed" 
                    icon="📤"
                    description="تم استلام الطلب بنجاح عبر بوابة العدل الإلكترونية وتعميمه على القسم المختص."
                  />
                  <PortalTrackingStep 
                    title="المراجعة والتحقق" 
                    date={selectedTrackingView.status === 'قيد_المعالجة' || selectedTrackingView.phase === 'قيد_المعالجة' ? "قيد المراجعة" : "تم التحقق"} 
                    status={selectedTrackingView.status !== 'جديد' ? 'completed' : 'pending'} 
                    icon="⚙️"
                    description="يجري حالياً فحص الوثائق والتأكد من استيفاء كافة الشروط القانونية المعمول بها."
                  />
                  <PortalTrackingStep 
                    title="اتخاذ القرار والاعتماد" 
                    date={selectedTrackingView.decided_at || selectedTrackingView.decidedDate} 
                    status={selectedTrackingView.decision_type || selectedTrackingView.decisionType ? 'completed' : 'pending'} 
                    icon="🖋️"
                    description={selectedTrackingView.decision_type || selectedTrackingView.decisionType 
                      ? `تم البث في طلبكم بقرار: ${selectedTrackingView.decision_type || selectedTrackingView.decisionType}.` 
                      : "بانتظار التأشير النهائي من طرف الجهة المسؤولة."}
                  />
                  <PortalTrackingStep 
                    title="الإصدار الرقمي" 
                    date={selectedTrackingView.issuedDate || (selectedTrackingView.decision_type ? "جاهز" : null)} 
                    status={selectedTrackingView.decision_type || selectedTrackingView.decisionType ? 'completed' : 'pending'} 
                    icon="✅"
                    isLast={true}
                    description="بمجرد صدور القرار، يصبح الإذن متاحاً للتحميل المباشر والمطابقة رقمياً عبر الكود المدمج."
                  />
                </div>
              </div>

              <div className="mt-14 flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setSelectedTrackingView(null)} 
                  className="px-12 py-4 bg-red-950 text-[#E6BE8A] rounded-2xl font-black text-xl hover:bg-red-900 transition-all shadow-xl shadow-red-950/20 active:scale-95"
                >
                  إغلاق نافذة التتبع
                </button>
                {(selectedTrackingView.decision_type || selectedTrackingView.decisionType) && (
                   <button 
                    onClick={() => { setSelectedDecision(selectedTrackingView); setSelectedTrackingView(null); }}
                    className="px-12 py-4 bg-white border-2 border-red-950 text-red-950 rounded-2xl font-black text-xl hover:bg-red-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                   >
                     تحميل القرار 📂
                   </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for tracking steps inside the portal
const PortalTrackingStep = ({ title, description, status, date, icon, isLast }: { title: string; description: string; status: 'completed' | 'pending'; date?: string | null; icon: string; isLast?: boolean }) => {
  return (
    <div className="relative pr-14 group">
      {/* Circle Icon Indicator */}
      <div className={`absolute right-0 top-0 w-10 h-10 rounded-full z-20 flex items-center justify-center text-xl transition-all duration-500 border-4 ${
        status === 'completed' 
          ? 'bg-red-950 border-[#E6BE8A] shadow-[0_0_15px_rgba(127,29,29,0.4)] scale-110' 
          : 'bg-white border-slate-200 text-slate-300'
      }`}>
        <span className={status === 'completed' ? 'animate-bounce-short text-[#E6BE8A]' : ''}>
          {status === 'completed' ? '✓' : ''}
        </span>
      </div>
      
      <div className={`p-6 rounded-3xl border transition-all duration-500 ${
        status === 'completed' 
          ? 'bg-white border-slate-200 shadow-lg shadow-slate-200/50' 
          : 'bg-transparent border-dashed border-slate-300 opacity-60'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h4 className={`text-xl font-black ${status === 'completed' ? 'text-red-950' : 'text-slate-500'}`}>
              {title}
            </h4>
          </div>
          {date && (
            <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex flex-col items-center gap-1 ${
              status === 'completed' 
                ? 'bg-red-50 border-red-100 text-red-950 shadow-sm' 
                : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              {new Date(date).toLocaleString('ar-MA') !== 'Invalid Date' ? (
                <>
                  <span className="text-[11px] font-black flex items-center gap-1.5 italic">
                    <span className="opacity-40">📅</span>
                    {new Date(date).toLocaleDateString('ar-MA')}
                  </span>
                  <span className="text-[10px] font-bold opacity-60 flex items-center gap-1.5 border-t border-red-950/10 pt-1 w-full justify-center">
                    <span className="opacity-40">🕒</span>
                    {new Date(date).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-bold">{date}</span>
              )}
            </div>
          )}
        </div>
        <p className={`text-base leading-relaxed font-bold ${status === 'completed' ? 'text-slate-600' : 'text-slate-400'}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default NotaryPortalWorkflow;
