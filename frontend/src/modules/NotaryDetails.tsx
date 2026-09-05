import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { ReturnToLandingButton } from '../components/common/ReturnToLandingButton';

export function NotaryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: notary, isLoading, error } = trpc.notaries.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
        <div className="text-[#0f2d62] text-xl font-bold">جاري التحميل...</div>
      </div>
    );
  }

  if (error || !notary) {
    return (
      <div className="min-h-screen bg-[#f7f4ef] flex flex-col items-center justify-center gap-4">
        <div className="text-red-600 text-xl font-bold">عذراً، لم يتم العثور على العدل المطلوب</div>
        <button 
          onClick={() => navigate('/directory')}
          className="px-6 py-2 bg-[#0f2d62] text-white rounded-lg hover:bg-[#0c2248]"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef] py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <ReturnToLandingButton className="mb-5" />
        {/* Header / Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => navigate('/directory')}
            className="text-[#0f2d62] hover:text-[#c37a1f] font-semibold flex items-center gap-2"
          >
            <span>←</span> العودة للبحث
          </button>
          <div className="flex items-center gap-3">
            <img src="/logos/adoul-logo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
            <h1 className="text-xl font-bold text-[#0f2d62]">الهيئة الوطنية للعدول</h1>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#e6dfcd] overflow-hidden">
          {/* Top Banner */}
          <div className="h-32 bg-[#0f2d62] relative">
            <div className="absolute -bottom-16 right-8 md:right-12">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                {notary.photo_url ? (
                  <img src={notary.photo_url} alt={notary.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl">
                    👤
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-20 pb-12 px-8 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[#0f2d62] mb-2">{notary.full_name}</h1>
                <p className="text-gray-600 text-lg">عدل محلف لدى {notary.region}</p>
                {notary.appointment_number && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-800 text-sm rounded-full border border-blue-100">
                    رقم التعيين: {notary.appointment_number}
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <button className="px-6 py-3 bg-[#c37a1f] hover:bg-[#a66615] text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                  <span>📅</span> حجز موعد
                </button>
                <button className="px-6 py-3 bg-[#0f2d62] hover:bg-[#0c2248] text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                  <span>💬</span> مراسلة
                </button>
              </div>
            </div>

            {/* Professional Description Section */}
            {notary.description && (
              <div className="mb-10 px-2">
                <h3 className="text-xl font-bold text-[#0f2d62] border-b border-[#c37a1f] pb-2 inline-block mb-6">
                  نبذة تعريفية
                </h3>
                <div className="bg-[#f9f7f1] p-8 rounded-3xl border border-[#e6dfcd] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-2 h-full bg-[#c37a1f]/10"></div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg relative z-10 italic font-serif">
                    "{notary.description}"
                  </p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 border-t border-gray-100 pt-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#0f2d62] border-b border-[#c37a1f] pb-2 inline-block">
                  معلومات الاتصال
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0f2d62]">
                      📍
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">العنوان المهني</p>
                      <p className="font-medium text-gray-800">{notary.office_location || 'غير متوفر'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0f2d62]">
                      📞
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الهاتف</p>
                      <p className="font-medium text-gray-800" dir="ltr">{notary.phone || 'غير متوفر'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0f2d62]">
                      ✉️
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                      <p className="font-medium text-gray-800">{notary.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#0f2d62] border-b border-[#c37a1f] pb-2 inline-block">
                  المعلومات المهنية
                </h3>

                <div className="bg-[#f9f7f1] p-6 rounded-2xl border border-[#e6dfcd] space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">الدائرة القضائية (الاستئناف)</p>
                    <p className="font-semibold text-[#0f2d62]">{notary.region}</p>
                  </div>
                  
                  {notary.primary_court && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">المحكمة الابتدائية</p>
                      <p className="font-semibold text-[#0f2d62]">{notary.primary_court}</p>
                    </div>
                  )}

                  {notary.court_name && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">مركز التوثيق</p>
                      <p className="font-semibold text-[#0f2d62]">{notary.court_name}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
                  <span>✓</span>
                  <span className="font-medium">معتمد للتوثيق الإلكتروني</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
