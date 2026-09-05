import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { trpc } from '../../trpc';

export const NotaryDashboard: React.FC = () => {
  const { user, notaryProfile, logout, sessionToken } = useAuth();
  const navigate = useNavigate();
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    appointment_decree_number: notaryProfile?.appointment_decree_number || '',
    appellate_court: notaryProfile?.appellate_court || notaryProfile?.court_name || '',
    primary_court: notaryProfile?.primary_court || '',
    phone: notaryProfile?.phone || '',
    office_address: notaryProfile?.office_address || '',
    profile_picture_url: notaryProfile?.profile_picture_url || '',
    description: notaryProfile?.description || '',
  });
  const [showPrimaryCourtSearch, setShowPrimaryCourtSearch] = useState(false);
  
  // Partner management state
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [newPartner, setNewPartner] = useState({ partner_name: '', contact_info: '', position_order: 1 });
  const [showAddPartner, setShowAddPartner] = useState(false);

  // tRPC hooks
  const { data: appellateCourts } = trpc.auth.getAppellateCourts.useQuery(undefined);
  const { data: primaryCourtsData } = trpc.auth.getPrimaryCourts.useQuery(
    { appellateCourt: editFormData.appellate_court },
    { 
      enabled: !!editFormData.appellate_court,
      staleTime: 30000,
      retry: 2
    }
  );
  const updateProfileMutation = trpc.auth.updateNotaryProfile.useMutation();

  // Partners management
  const { data: partners, refetch: refetchPartners } = trpc.auth.getNotaryPartners.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken }
  );
  const updatePartnerAvailabilityMutation = trpc.auth.updatePartnerAvailability.useMutation();
  const addPartnerMutation = trpc.auth.addNotaryPartner.useMutation();
  const updatePartnerMutation = trpc.auth.updateNotaryPartner.useMutation();
  const deletePartnerMutation = trpc.auth.deleteNotaryPartner.useMutation();

  const primaryCourts = React.useMemo(() => {
    console.log('primaryCourtsData state:', primaryCourtsData);
    return primaryCourtsData && 'primary_courts' in primaryCourtsData 
      ? primaryCourtsData.primary_courts 
      : [];
  }, [primaryCourtsData]);

  // Update form when profile changes
  useEffect(() => {
    if (notaryProfile) {
      setEditFormData({
        appointment_decree_number: notaryProfile.appointment_decree_number,
        appellate_court: notaryProfile.appellate_court || notaryProfile.court_name,
        primary_court: notaryProfile.primary_court || '',
        phone: notaryProfile.phone || '',
        office_address: notaryProfile.office_address || '',
        profile_picture_url: notaryProfile.profile_picture_url || '',
        description: notaryProfile.description || '',
      });
    }
  }, [notaryProfile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Navigate to existing modules
  const navigateToModule = (path: string) => {
    navigate(path);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset form to current profile data
      if (notaryProfile) {
        setEditFormData({
          appointment_decree_number: notaryProfile.appointment_decree_number,
          appellate_court: notaryProfile.appellate_court || notaryProfile.court_name,
          primary_court: notaryProfile.primary_court || '',
          phone: notaryProfile.phone || '',
          office_address: notaryProfile.office_address || '',
          profile_picture_url: notaryProfile.profile_picture_url || '',
          description: notaryProfile.description || '',
        });
      }
      setShowAddPartner(false);
      setEditingPartnerId(null);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Create an image to resize it
        const img = new Image();
        img.onload = () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Resize to max 800x800 for better quality
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Get compressed base64 (quality 0.85 for better quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          
          // Only update the form data, don't auto-save
          setEditFormData({ ...editFormData, profile_picture_url: compressedBase64 });
        };
        img.src = base64String;
      };
      reader.onerror = () => {
        alert('فشل في قراءة الصورة');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!sessionToken) {
        alert('جلسة غير صالحة');
        return;
      }

      await updateProfileMutation.mutateAsync({
        sessionToken,
        appointment_decree_number: editFormData.appointment_decree_number,
        appellate_court: editFormData.appellate_court,
        primary_court: editFormData.primary_court || null,
        phone: editFormData.phone || null,
        office_address: editFormData.office_address || null,
        profile_picture_url: editFormData.profile_picture_url || null,
        description: editFormData.description || null,
      });

      alert('تم تحديث الملف الشخصي بنجاح');
      setIsEditing(false);
      // Reload page to get fresh data
      window.location.reload();
    } catch (error: any) {
      alert('فشل في تحديث الملف: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  const handlePartnerAvailabilityToggle = async (partnerId: string, currentStatus: boolean) => {
    try {
      if (!sessionToken) {
        alert('جلسة غير صالحة');
        return;
      }

      await updatePartnerAvailabilityMutation.mutateAsync({
        sessionToken,
        partnerId,
        isAvailable: !currentStatus,
      });

      // Refetch partners to update UI
      refetchPartners();
    } catch (error: any) {
      alert('فشل في تحديث حالة الشريك: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  const handleAddPartner = async () => {
    try {
      if (!sessionToken) {
        alert('جلسة غير صالحة');
        return;
      }

      await addPartnerMutation.mutateAsync({
        sessionToken,
        partner_name: newPartner.partner_name,
        contact_info: newPartner.contact_info || undefined,
        position_order: newPartner.position_order,
      });

      setNewPartner({ partner_name: '', contact_info: '', position_order: 1 });
      setShowAddPartner(false);
      refetchPartners();
      alert('تم إضافة الشريك بنجاح');
    } catch (error: any) {
      alert('فشل في إضافة الشريك: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;

    try {
      if (!sessionToken) {
        alert('جلسة غير صالحة');
        return;
      }

      await deletePartnerMutation.mutateAsync({
        sessionToken,
        partnerId,
      });

      refetchPartners();
      alert('تم حذف الشريك بنجاح');
    } catch (error: any) {
      alert('فشل في حذف الشريك: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div className="space-y-10 pb-20 bg-[#F8FAFC]">
      
      {/* 🏛️ Centered Premium Hero Header */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Artistic Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-white to-transparent pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-gradient-to-b from-red-950/5 via-transparent to-transparent rounded-[100%] blur-3xl opacity-50"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Centered Profile Picture with Royal Frame */}
          <div className="inline-block relative mb-8 group">
             {/* Decorative Outer Rings */}
             <div className="absolute -inset-4 bg-gradient-to-tr from-[#E6BE8A]/30 via-transparent to-red-950/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
             <div className="absolute -inset-1 bg-gradient-to-tr from-[#E6BE8A] via-amber-400 to-[#E6BE8A] rounded-full animate-pulse transition duration-1000"></div>
             
             <input
               type="file"
               accept="image/*"
               onChange={handleProfilePictureChange}
               className="hidden"
               id="hero-avatar-upload"
             />
             <label htmlFor="hero-avatar-upload" className="cursor-pointer block relative">
               <div className="relative h-44 w-44 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                 {(editFormData.profile_picture_url || notaryProfile?.profile_picture_url) ? (
                   <img
                     src={editFormData.profile_picture_url || notaryProfile?.profile_picture_url}
                     alt="Profile"
                     className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                     <span className="text-6xl opacity-30 grayscale saturate-0">👤</span>
                   </div>
                 )}
                 <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white backdrop-blur-sm">
                   <span className="text-2xl mb-1">📸</span>
                   <span className="text-[10px] font-black uppercase tracking-widest">تحديث الصورة</span>
                 </div>
               </div>
             </label>

             {/* Save Button for Image */}
             {editFormData.profile_picture_url && editFormData.profile_picture_url !== notaryProfile?.profile_picture_url && (
                <button
                  onClick={async () => {
                    if (!sessionToken || !notaryProfile) return;
                    try {
                      await updateProfileMutation.mutateAsync({
                        sessionToken,
                        appointment_decree_number: notaryProfile.appointment_decree_number,
                        appellate_court: notaryProfile.appellate_court || notaryProfile.court_name,
                        primary_court: notaryProfile.primary_court || null,
                        phone: notaryProfile.phone || null,
                        office_address: notaryProfile.office_address || null,
                        profile_picture_url: editFormData.profile_picture_url,
                      });
                      window.location.reload();
                    } catch (err) {}
                  }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-950 text-[#E6BE8A] px-6 py-2 rounded-full font-black text-[10px] shadow-2xl border border-[#E6BE8A] whitespace-nowrap z-30 ring-4 ring-white"
                >
                  حفظ صورة الملف الشخصي
                </button>
             )}
          </div>

          {/* Identity Section */}
          <div className="flex flex-col items-center">
            <h1 className="text-5xl font-black text-slate-900 font-maghribi tracking-tight mb-3">
              {user?.full_name}
            </h1>
            <div className="flex items-center gap-3">
               <span className="h-px w-8 bg-[#E6BE8A]"></span>
               <p className="text-xl text-slate-600 font-bold uppercase tracking-wide">
                 عدل منتصب للاشهاد بدائرة {notaryProfile?.appellate_court?.includes('محكمة الاستئناف') ? notaryProfile.appellate_court : `محكمة الاستئناف بـ${notaryProfile?.appellate_court || '---'}`} - قسم التوثيق بـ{notaryProfile?.primary_court || notaryProfile?.jurisdiction || '---'}
               </p>
               <span className="h-px w-8 bg-[#E6BE8A]"></span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
               <div className="bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">رقم قرار التعيين</span>
                  <span className="text-red-950 font-black">{notaryProfile?.appointment_decree_number || '---'}</span>
               </div>
               <div className="bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">رقم الهاتف</span>
                  <span className="text-red-950 font-black" dir="ltr">{notaryProfile?.phone || '---'}</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 📊 LEFT: Main Content & Modules */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 📈 Integrated Stats Bento Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'سجلات اليوم', value: '0', icon: '📋', color: 'bg-blue-600', sub: 'سجلات مفتوحة' },
                { label: 'معاملات منجزة', value: '0', icon: '✅', color: 'bg-emerald-600', sub: 'تم تصحيحها' },
                { label: 'طلبات عالقة', value: '0', icon: '⏳', color: 'bg-amber-500', sub: 'في انتظار القاضي' },
              ].map((stat, i) => (
                <div key={i} className="bg-white group p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${stat.color}`}></div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl mb-4 grayscale opacity-10 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">{stat.icon}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-4xl font-black text-slate-900 group-hover:scale-110 transition-transform origin-right">{stat.value}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 🧩 Professional Portals Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between flex-row-reverse pb-2 border-b-2 border-[#E6BE8A]/20">
                <h2 className="text-3xl font-black text-slate-900 font-maghribi">بوابة الإدارة الرقمية</h2>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-950"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#E6BE8A]"></div>
                </div>
              </div>
              
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-8">
                {[
                  { title: 'الطلبات المهنية الوطنية', desc: 'متابعة قرارات التعيين والانتقال والقضايا الجارية', icon: '📬', path: '/notary-portal', theme: 'from-red-50 to-white hover:border-red-200 text-red-700', isNew: true },
                  { title: 'طلب شهادة عمل', desc: 'استخراج شهادة العمل وتتبع وضعيتها الإدارية', icon: '📝', path: '/work-certificate-portal', theme: 'from-blue-50 to-white hover:border-blue-200 text-blue-700', isNew: true },
                  { title: 'إشعار بالتوجه', desc: 'إشعار بالتوجه خارج مكتب التعيين لتلقي إشهادات', icon: '📍', path: '/office-movement-portal', theme: 'from-orange-50 to-white hover:border-orange-200 text-orange-700', isNew: true },
                  { title: 'خدمة التلقي العدلي عن بعد', desc: 'جلسات تلقي سمعية–بصرية مع تحقق الهوية والتوثيق القانوني والتسجيل', icon: '🎥', path: '?module=remoteNotarialHearing', theme: 'from-green-50 to-white hover:border-green-200 text-green-700', isNew: true },
                  { title: 'عقود الزواج', desc: 'إدارة وتوثيق الروابط العائلية رقمياً', icon: '💍', path: '/marriages', theme: 'from-pink-50 to-white hover:border-pink-200 text-pink-700' },
                  { title: 'نظام الرسوم', desc: 'تتبع المستخلصات والرسوم القضائية', icon: '💰', path: '/fees', theme: 'from-emerald-50 to-white hover:border-emerald-200 text-emerald-700' },
                  { title: 'محرر العقود', desc: 'صياغة المحاضر والوثائق الرسمية وبشكل ذكي', icon: '📜', path: '/contracts', theme: 'from-blue-50 to-white hover:border-blue-200 text-blue-700' },
                  { title: 'الأرشيف', desc: 'البحث والوصول للملفات المؤرشفة', icon: '📁', path: '/files', theme: 'from-amber-50 to-white hover:border-amber-200 text-amber-700' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className={`group relative flex items-center gap-8 p-8 bg-gradient-to-br ${item.theme} rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all duration-500`}
                  >
                    <div className="w-20 h-20 bg-white shadow-lg rounded-[28px] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 flex-shrink-0 relative">
                      {item.icon}
                      {'isNew' in item && item.isNew && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[10px] text-white font-black animate-bounce shadow-lg border-2 border-white">جديد</div>
                      )}
                    </div>
                    <div className="text-right">
                      <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-red-950 transition-colors uppercase font-maghribi">{item.title}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="absolute top-8 left-8 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-4 group-hover:translate-x-0">
                       <span className="text-2xl">←</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 📤 Royal Messaging Banner */}
            <div className="relative group overflow-hidden rounded-[56px] shadow-2xl shadow-red-950/20">
              <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-red-900 to-red-950"></div>
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              
              <div className="relative z-10 p-12 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="text-center md:text-right">
                  <div className="inline-block bg-[#E6BE8A]/10 border border-[#E6BE8A]/30 px-4 py-1.5 rounded-full mb-6">
                    <span className="text-[#E6BE8A] text-[10px] font-black uppercase tracking-widest">الاتصال القضائي الرسمي</span>
                  </div>
                  <h3 className="text-3xl font-black text-white font-maghribi mb-4">منصة المراسلات الفورية</h3>
                  <p className="text-red-200/70 text-base max-w-sm leading-relaxed font-medium">
                    استخدم هذا النظام للتواصل المباشر مع قاضي التوثيق بالمحكمة الابتدائية المعنية.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/messages')}
                  className="bg-gradient-to-br from-[#E6BE8A] via-amber-400 to-[#E6BE8A] text-red-950 px-12 py-5 rounded-[28px] font-black text-lg hover:scale-105 transition-all shadow-3xl shadow-amber-400/30 group/btn flex items-center gap-4"
                >
                  <span className="text-2xl group-hover/btn:translate-x-1 transition-transform">
                    <span>📥</span>
                  </span>
                  <span>فتح صندوق الوارد</span>
                </button>
              </div>
            </div>

          </div>

          {/* 📋 RIGHT: Settings & Partners */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* Official Data Management */}
            <div className="bg-white rounded-[44px] shadow-2xl shadow-slate-200/40 border border-slate-100 p-10 overflow-hidden relative">
              <div className="flex items-center justify-between mb-8 flex-row-reverse">
                 <h3 className="text-xl font-black text-slate-800 font-maghribi">البيانات المهنية</h3>
                 <button
                   onClick={handleEditToggle}
                   className="text-red-900 text-xs font-black uppercase tracking-tighter hover:bg-red-50 px-3 py-1 rounded-full transition-all"
                 >
                   {isEditing ? 'إلغاء' : 'تعديل البيانات'}
                 </button>
              </div>

              {!isEditing ? (
                <div className="space-y-8 text-right">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase">المقر الاجتماعي / المكتب</p>
                     <p className="text-slate-700 font-bold leading-relaxed">{notaryProfile?.office_address || 'عنوان المكتب غير محدد حالياً'}</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase">رقم الهاتف (للتواصل والواتساب)</p>
                     <p className="text-slate-700 font-bold font-mono text-sm" dir="ltr">{notaryProfile?.phone || 'غير محدد'}</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase">نبذة تعريفية (تظهر للعموم)</p>
                     <p className="text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{notaryProfile?.description || 'لا يوجد وصف حالياً'}</p>
                  </div>
                  <div className="pt-8 border-t border-slate-100 flex items-center justify-between flex-row-reverse">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">قاضي التوثيق</p>
                        <p className="text-red-900 font-black text-sm">الأستاذ قاضي دائرة الاستئناف</p>
                     </div>
                     <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl grayscale opacity-40">⚖️</div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full bg-red-50 text-red-600 font-black py-4 rounded-3xl hover:bg-red-100 transition-colors mt-4 text-sm flex items-center justify-center gap-2"
                  >
                    <span>تسجيل الخروج</span>
                    <span>🚪</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-right">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">دائرة الاستئناف</label>
                    <select
                      value={editFormData.appellate_court}
                      onChange={(e) => {
                        console.log('Appellate court changed:', e.target.value);
                        setEditFormData({ ...editFormData, appellate_court: e.target.value, primary_court: '' });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-red-950/10 outline-none transition-all"
                    >
                      {appellateCourts?.map((court) => (
                        <option key={court} value={court}>{court}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">قسم التوثيق (المدينة)</label>
                    <div className="relative">
                      <select
                        value={editFormData.primary_court}
                        onChange={(e) => setEditFormData({ ...editFormData, primary_court: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-red-950/10 outline-none transition-all"
                      >
                        <option value="">اختر قسم التوثيق...</option>
                        {primaryCourts.map((court: string) => (
                          <option key={court} value={court}>{court}</option>
                        ))}
                      </select>
                      {primaryCourts.length === 0 && editFormData.appellate_court && (
                        <p className="text-[9px] text-amber-600 mt-1 mr-2">جاري تحميل المدن لهذه الدائرة...</p>
                      )}
                      {!editFormData.appellate_court && (
                        <p className="text-[9px] text-red-500 mt-1 mr-2 italic">يجب اختيار دائرة الاستئناف أولاً</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">رقم الهاتف (للتواصل والواتساب)</label>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="06XXXXXXXX"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none text-right focus:ring-2 focus:ring-red-950/10 transition-all font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">نبذة تعريفية للجمهور</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={4}
                      placeholder="أدخل وصفاً مهنياً يظهر في دليل العدول..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-red-950/10 outline-none transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">قرار التعيين</label>
                    <input
                      type="text"
                      value={editFormData.appointment_decree_number}
                      onChange={(e) => setEditFormData({ ...editFormData, appointment_decree_number: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-red-950 text-[#E6BE8A] font-black py-4 rounded-3xl shadow-xl hover:bg-red-900 transition-all mt-6 text-sm"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              )}
            </div>

            {/* Partners Card with Premium Switch */}
            <div className="bg-white rounded-[44px] shadow-2xl shadow-slate-200/40 border border-slate-100 p-10 overflow-hidden relative">
              <div className="flex items-center justify-between mb-8 flex-row-reverse border-b border-slate-100 pb-4">
                 <h3 className="text-xl font-black text-slate-800 font-maghribi">الشركاء المهنيون</h3>
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نشط الآن</span>
                 </div>
              </div>

              {partners && partners.length > 0 ? (
                <div className="space-y-6">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="group flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-transparent hover:border-red-950/10 hover:bg-white hover:shadow-lg transition-all duration-300"
                    >
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={partner.is_available ?? true}
                          onChange={() => handlePartnerAvailabilityToggle(partner.id, partner.is_available ?? true)}
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-950"></div>
                      </label>
                      {editingPartnerId === partner.id ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingPartnerName}
                              onChange={(e) => setEditingPartnerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePartnerName(partner);
                                if (e.key === 'Escape') handleCancelEditPartner();
                              }}
                              autoFocus
                              className="bg-white border border-red-950/30 focus:border-red-950 rounded-xl px-2.5 py-1 text-sm font-bold text-slate-900 outline-none shadow-sm w-32 sm:w-44"
                              placeholder="اسم الشريك..."
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePartnerName(partner)}
                              disabled={updatePartnerMutation.isPending}
                              className="p-1.5 bg-red-950 text-[#E6BE8A] hover:bg-red-900 rounded-lg shadow-sm transition-all disabled:opacity-50"
                              title="حفظ"
                            >
                              {updatePartnerMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditPartner}
                              disabled={updatePartnerMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">موثق شريك</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black text-slate-900">{partner.partner_name}</p>
                            <button
                              type="button"
                              onClick={() => handleStartEditPartner(partner)}
                              className="opacity-70 group-hover:opacity-100 hover:scale-110 p-1 text-slate-400 hover:text-red-950 hover:bg-slate-200/60 rounded-lg transition-all"
                              title="تعديل الاسم"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">موثق شريك</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="bg-gradient-to-br from-red-950 to-red-900 p-6 rounded-3xl text-center shadow-xl shadow-red-950/20">
                     <p className="text-[#E6BE8A] text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">
                        <span>التواجد الجماعي</span>
                     </p>
                     <p className="text-white font-black text-2xl">
                        <span>{partners.filter(p => p.is_available).length}</span>
                        <span className="text-xs text-[#E6BE8A]/50 mx-2">/</span>
                        <span>{partners.length}</span>
                     </p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center opacity-30">
                   <span className="text-4xl block mb-2">
                     <span>🤝</span>
                   </span>
                   <p className="text-xs font-black text-slate-500">
                     <span>لا يوجد شركاء مسجلين</span>
                   </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};


