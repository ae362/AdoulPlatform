import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc } from '../../trpc';

interface TemplateFormProps {
  templateId: string;
  onBack: () => void;
  onSuccess: (draft: string) => void;
  context: {
    state: any; // FeesAgentState
    user: any; // User
  };
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ templateId, onBack, onSuccess, context }) => {
  const { data: variables, isLoading } = trpc.smartDrafting.getTemplateVariables.useQuery({ templateId });
  const generateMutation = trpc.smartDrafting.generateDraft.useMutation();
  
  const { register, handleSubmit, formState: { errors }, setValue, getValues } = useForm();
  const [isMapped, setIsMapped] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Smart Mapping Logic
  useEffect(() => {
    if (!variables || !context) return;

    const { state, user } = context;
    const sellers = state.sellers || [];
    const buyers = state.buyers || [];
    const properties = state.properties || [];
    const finance = state.finance || {};
    const meta = state.meta || {};

    // Helper to join names
    const joinNames = (parties: any[]) => parties.map(p => p.name).filter(Boolean).join(' و ');
    const formatArabicDayName = (isoDate?: string) => {
      const date = isoDate ? new Date(isoDate) : new Date();
      if (Number.isNaN(date.getTime())) return '';
      try {
        return new Intl.DateTimeFormat('ar-MA', { weekday: 'long' }).format(date);
      } catch {
        return '';
      }
    };

    const formatHijriText = (isoDate?: string) => {
      const date = isoDate ? new Date(isoDate) : new Date();
      if (Number.isNaN(date.getTime())) return '';
      try {
        return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      } catch {
        return '';
      }
    };

    const formatTime = () => {
      const date = new Date();
      try {
        return new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(date);
      } catch {
        return '';
      }
    };

    Object.entries(variables).forEach(([key, def]: [string, any]) => {
      let value = '';

      // 1. Map based on Key Name (Heuristics)
      switch (key) {
        case 'COURT_CITY':
          value = user?.courtCity || meta.notaryPrimary || 'شفشاون'; // Fallback
          break;
        case 'PRIMARY_COURT':
          value = 'المحكمة الابتدائية بشفشاون'; // Could be dynamic
          break;
        case 'ADUL_1_NAME':
          value = meta.notaryPrimary || user?.full_name || '';
          break;
        case 'ADUL_2_NAME':
          value = meta.notarySecondary || '';
          break;
        case 'SELLER_NAME':
        case 'DONOR_NAME': // Wahib is like Seller
          value = sellers[0]?.name || '';
          break;
        case 'SELLER_CIN':
        case 'DONOR_CIN':
          value = sellers[0]?.idNumber || '';
          break;
        case 'DONOR_ADDRESS':
          value = sellers[0]?.address || '';
          break;
        case 'DONOR_DOB':
          value = sellers[0]?.dateOfBirth || '';
          break;
        case 'BUYER_NAME':
        case 'DONEE_NAME': // Mawhoub lah is like Buyer
          value = buyers[0]?.name || '';
          break;
        case 'BUYER_CIN':
        case 'DONEE_CIN':
          value = buyers[0]?.idNumber || '';
          break;
        case 'DONEE_ADDRESS':
          value = buyers[0]?.address || '';
          break;
        case 'DONEE_DOB':
          value = buyers[0]?.dateOfBirth || '';
          break;
        case 'PROPERTY_DESCRIPTION':
          value = properties[0]?.propertyName || '';
          // Add location if available
          if (properties[0]?.location) value += ` الكائن بـ ${properties[0].location}`;
          break;
        case 'PROPERTY_LOCATION':
          value = properties[0]?.location || '';
          break;
        case 'PRICE':
        case 'VALUE':
          value = finance.price?.toString() || '';
          break;
        case 'DATE_HIJRI':
          value = meta.dateHijri || '';
          break;
        case 'DATE_GREGORIAN':
          value = meta.dateGregorian || '';
          break;
        case 'TIME':
          value = formatTime();
          break;
        case 'DAY_NAME':
          value = formatArabicDayName(meta.dateGregorian);
          break;
        case 'DATE_HIJRI_TEXT':
          value = formatHijriText(meta.dateGregorian);
          break;

        // Marriage (Template: TEMPLATE_ZAWAJ_SULAIMAN_AMTIA3)
        case 'AUTH_FILE_NUMBER':
          value = state.marriageDetails?.authorizationNumber || '';
          break;
        case 'AUTH_DATE':
        case 'AUTH_DATE_GREGORIAN':
          value = state.marriageDetails?.authorizationDate || '';
          break;

        case 'HUSBAND_NAME':
          value = sellers[0]?.name || '';
          break;
        case 'HUSBAND_POB':
          value = sellers[0]?.birthCertificateCity || sellers[0]?.birthCertificateCommune || '';
          break;
        case 'HUSBAND_DOB':
          value = sellers[0]?.dateOfBirth || '';
          break;
        case 'HUSBAND_DOB_YEAR':
          value = sellers[0]?.dateOfBirth ? new Date(sellers[0].dateOfBirth).getFullYear().toString() : '';
          break;
        case 'HUSBAND_FATHER':
        case 'HUSBAND_FATHER_NAME':
          value = sellers[0]?.fatherName || '';
          break;
        case 'HUSBAND_MOTHER':
        case 'HUSBAND_MOTHER_NAME':
          value = sellers[0]?.motherName || '';
          break;
        case 'HUSBAND_JOB':
          value = sellers[0]?.profession || '';
          break;
        case 'HUSBAND_ADDRESS':
          value = sellers[0]?.address || '';
          break;
        case 'HUSBAND_CIN':
          value = sellers[0]?.idNumber || '';
          break;
        case 'HUSBAND_NATIONALITY':
          value = sellers[0]?.nationality || '';
          break;
        case 'HUSBAND_STATUS':
        case 'HUSBAND_MARITAL_STATUS':
          value = sellers[0]?.maritalStatus || '';
          break;
        
        // New Husband Certificate Fields
        case 'HUSBAND_BIRTH_CERT_NUM':
          value = sellers[0]?.birthCertificateNumber || '';
          break;
        case 'HUSBAND_BIRTH_COMMUNE':
          value = sellers[0]?.birthCertificateCommune || '';
          break;
        case 'HUSBAND_ADMIN_CERT_NUM':
          value = sellers[0]?.engagementCertificateNumber || '';
          break;
        case 'HUSBAND_ADMIN_CERT_COMMUNE':
          value = sellers[0]?.engagementCertificateCommune || '';
          break;
        case 'HUSBAND_ADMIN_CERT_PROVINCE':
          value = sellers[0]?.engagementCertificateCity || ''; // Using City as Province fallback
          break;
        case 'HUSBAND_ADMIN_CERT_DATE':
          value = sellers[0]?.engagementCertificateDate || '';
          break;

        case 'WIFE_NAME':
          value = buyers[0]?.name || '';
          break;
        case 'WIFE_POB':
          value = buyers[0]?.birthCertificateCity || buyers[0]?.birthCertificateCommune || '';
          break;
        case 'WIFE_DOB':
          value = buyers[0]?.dateOfBirth || '';
          break;
        case 'WIFE_FATHER':
        case 'WIFE_FATHER_NAME':
          value = buyers[0]?.fatherName || '';
          break;
        case 'WIFE_MOTHER':
        case 'WIFE_MOTHER_NAME':
          value = buyers[0]?.motherName || '';
          break;
        case 'WIFE_JOB':
          value = buyers[0]?.profession || 'بدون مهنة';
          break;
        case 'WIFE_ADDRESS':
          value = buyers[0]?.address || '';
          break;
        case 'WIFE_CIN':
          value = buyers[0]?.idNumber || '';
          break;
        case 'WIFE_NATIONALITY':
          value = buyers[0]?.nationality || '';
          break;
        case 'WIFE_STATUS':
        case 'WIFE_MARITAL_STATUS':
          value = buyers[0]?.maritalStatus || '';
          break;

        // New Wife Certificate Fields
        case 'WIFE_BIRTH_CERT_NUM':
          value = buyers[0]?.birthCertificateNumber || '';
          break;
        case 'WIFE_BIRTH_COMMUNE':
          value = buyers[0]?.birthCertificateCommune || '';
          break;
        case 'WIFE_ADMIN_CERT_NUM':
          value = buyers[0]?.engagementCertificateNumber || '';
          break;
        case 'WIFE_ADMIN_CERT_COMMUNE':
          value = buyers[0]?.engagementCertificateCommune || '';
          break;
        case 'WIFE_ADMIN_CERT_DATE':
          value = buyers[0]?.engagementCertificateDate || '';
          break;

        case 'DOWRY_AMOUNT':
        case 'DOWRY_TOTAL':
          value = state.marriageDetails?.dowryAmount?.toString() || '';
          break;
        case 'DOWRY_WORDS':
          value = state.marriageDetails?.dowryAmountInWords || '';
          break;
        case 'DOWRY_DETAILS': {
          const isDowryReceived = state.marriageDetails?.isDowryReceived;
          const dowryAmount = state.marriageDetails?.dowryAmount || 0;
          const dowryAdvance = state.marriageDetails?.dowryAdvance || 0;
          const dowryDeferred = state.marriageDetails?.dowryDeferred || 0;

          if (isDowryReceived === 'مقبوض') {
            value = 'قبضته الزوجة اعترافًا فأبرأته منه فبرئ';
          } else if (isDowryReceived === 'مؤجل') {
            value = 'يؤديه لها قبل الدخول';
          } else if (isDowryReceived === 'بينهما') {
            if (dowryAdvance > 0 && dowryDeferred > 0 && dowryAmount > 0) {
              value = `قبضت الزوجة ${dowryAdvance} درهم معاينة، والكالئ ${dowryDeferred} درهم يؤديه لها قبل الدخول`;
            } else {
              value = 'بين نقد وكالئ';
            }
          } else {
            value = 'على ما يقتضيه الاتفاق';
          }
          break;
        }

        case 'GUARDIAN_NAME':
          value = buyers[0]?.guardianName || buyers[0]?.fatherName || '';
          break;
        case 'GUARDIAN_DOB':
          value = buyers[0]?.guardianDOB || '';
          break;
        case 'GUARDIAN_JOB':
          value = buyers[0]?.guardianProfession || '';
          break;
        case 'GUARDIAN_ADDRESS':
          value = buyers[0]?.guardianAddress || buyers[0]?.address || '';
          break;
        case 'GUARDIAN_CIN':
          value = buyers[0]?.guardianNationalID || '';
          break;
        case 'SELLERS_LIST':
          value = joinNames(sellers);
          break;
        case 'HEIRS_LIST':
          // If we have heirs in state (e.g. for inheritance), map them
          // Assuming sellers might be heirs in some context or specific field
          value = joinNames(sellers); 
          break;
        case 'WITNESSES_LIST':
           value = joinNames(state.witnesses || []);
           break;
        default:
          break;
      }

      // 2. Map based on Source (if not already set)
      if (!value && def.source === 'ADUL_RECORD') {
         // Try to find in user/meta again if missed
      }

      if (value) {
        setValue(key, value);
      }
    });

    setIsMapped(true);

  }, [variables, context, setValue]);

  const onSubmit = (data: any) => {
    console.log("Submitting data:", data);
    generateMutation.mutate(
      { templateId, data },
      {
        onSuccess: (result) => {
          onSuccess(result.draft);
        },
        onError: (error) => {
          console.error("Generation failed:", error);
        }
      }
    );
  };

  // Auto-Submit Logic
  useEffect(() => {
    if (isMapped && variables) {
      const currentValues = getValues();
      const missingFields = Object.entries(variables)
        .filter(([key, def]: [string, any]) => def.required && !currentValues[key]);

      if (missingFields.length === 0) {
        // All required fields are filled -> Auto Submit
        handleSubmit(onSubmit)();
      } else {
        // Missing fields -> Show Form
        setShowForm(true);
      }
    }
  }, [isMapped, variables, getValues, handleSubmit]);

  if (isLoading) return <div className="p-8 text-center">جاري تحميل الحقول...</div>;
  if (!variables) return <div className="p-8 text-center text-red-600">لم يتم العثور على بيانات النموذج</div>;

  // If auto-submitting (form hidden), show loading
  // BUT if there is an error, show the form so the user can see it!
  if (!showForm && !generateMutation.error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <span className="text-4xl animate-spin">⏳</span>
          <h2 className="text-xl font-bold text-gray-800">جاري توليد الرسم تلقائياً...</h2>
          <p className="text-gray-500">يتم استخراج البيانات من الملف وتوليد النص...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
              ← رجوع
            </button>
            <h2 className="text-2xl font-bold text-gray-800">ملء بيانات النموذج: {templateId}</h2>
          </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
          {generateMutation.error && (
            <div className="bg-red-50 p-4 rounded-xl mb-6 text-sm text-red-800 border border-red-200" dir="rtl">
              ❌ حدث خطأ أثناء التوليد: {generateMutation.error.message}
              <br/>
              يرجى التأكد من تشغيل خدمة الذكاء الاصطناعي (Ollama).
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-xl mb-6 text-sm text-yellow-800 border border-yellow-200">
            ⚠️ لم نتمكن من ملء جميع الحقول تلقائياً. يرجى إكمال البيانات الناقصة أدناه.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(variables).map(([key, def]: [string, any]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  {def.label}
                  {def.required && <span className="text-red-500 mr-1">*</span>}
                  <span className="text-xs font-normal text-gray-500 mr-2">({def.source})</span>
                </label>
                
                <input
                  {...register(key, { required: def.required })}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                  placeholder={`أدخل ${def.label}`}
                />
                
                {errors[key] && (
                  <p className="text-red-500 text-xs">هذا الحقل مطلوب</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {generateMutation.isPending ? 'جاري التوليد...' : '✨ توليد الرسم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

