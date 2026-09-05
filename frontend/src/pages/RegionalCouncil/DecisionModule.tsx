import React, { useState } from 'react';

interface DecisionModuleProps {
  notificationId: string;
  notaryName: string;
  requestType: string;
}

const DecisionModule: React.FC<DecisionModuleProps> = ({
  notificationId,
  notaryName,
  requestType,
}) => {
  const [decisionType, setDecisionType] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [conditions, setConditions] = useState<string[]>(['']);
  const [duration, setDuration] = useState<string>('');
  const [durationUnit, setDurationUnit] = useState<string>('يوم');
  const [professionalRemarks, setProfessionalRemarks] = useState<string>('');
  const [generatedDocumentNumber, setGeneratedDocumentNumber] = useState<string>('');

  const handleAddCondition = () => {
    setConditions([...conditions, '']);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = value;
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleGenerateDecision = () => {
    // Generate document number format: 2026/GRC-TET/N-00817
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
    setGeneratedDocumentNumber(`${year}/GRC-TET/N-${random}`);
  };

  const handleGenerateDocument = () => {
    if (!decisionType || !duration) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    handleGenerateDecision();
    alert('تم توليد الوثيقة بنجاح. رقم الوثيقة: ' + generatedDocumentNumber);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-red-950 mb-6">وحدة القرار</h1>

        {/* Notification Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">رقم الإشعار</p>
              <p className="font-semibold text-red-950">{notificationId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">اسم العدل</p>
              <p className="font-semibold">{notaryName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">نوع الطلب</p>
              <p className="font-semibold">{requestType}</p>
            </div>
          </div>
        </div>

        {/* Decision Form */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Decision Type */}
          <div>
            <label className="block text-sm font-semibold text-red-950 mb-3">نوع القرار *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['موافقة', 'موافقة_مع_شروط', 'رفض', 'تأجيل'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDecisionType(type)}
                  className={`px-4 py-2 rounded-lg border-2 transition ${
                    decisionType === type
                      ? 'border-red-950 bg-red-50 text-red-950 font-semibold'
                      : 'border-gray-300 text-gray-700 hover:border-red-950'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-red-950 mb-2">المدة المسموح بها *</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="أدخل المدة"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-red-950 mb-2">وحدة الزمن *</label>
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
              >
                <option>ساعة</option>
                <option>يوم</option>
                <option>تاريخ محدد</option>
              </select>
            </div>
          </div>

          {/* Reasoning - Required for rejection */}
          <div>
            <label className="block text-sm font-semibold text-red-950 mb-2">
              تعليل القرار {decisionType === 'رفض' && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="أدخل تعليل القرار..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            />
          </div>

          {/* Conditions - for conditional approval */}
          {decisionType === 'موافقة_مع_شروط' && (
            <div>
              <label className="block text-sm font-semibold text-red-950 mb-3">الشروط المهنية</label>
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={condition}
                      onChange={(e) => handleConditionChange(index, e.target.value)}
                      placeholder={`الشرط ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                    {conditions.length > 1 && (
                      <button
                        onClick={() => handleRemoveCondition(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddCondition}
                className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                + إضافة شرط
              </button>
            </div>
          )}

          {/* Professional Remarks */}
          <div>
            <label className="block text-sm font-semibold text-red-950 mb-2">ملاحظات مهنية</label>
            <textarea
              value={professionalRemarks}
              onChange={(e) => setProfessionalRemarks(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            />
          </div>

          {/* Generated Document Info */}
          {generatedDocumentNumber && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-sm text-green-700">تم توليد الوثيقة برقم: <span className="font-bold">{generatedDocumentNumber}</span></p>
              <p className="text-xs text-green-600 mt-1">يمكنك الآن طباعة أو أرشفة الوثيقة</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              onClick={handleGenerateDocument}
              className="flex-1 px-6 py-3 bg-red-950 text-white rounded-lg hover:bg-red-900 transition font-semibold"
            >
              توليد الوثيقة الرسمية
            </button>
            <button className="flex-1 px-6 py-3 border-2 border-red-950 text-red-950 rounded-lg hover:bg-red-50 transition font-semibold">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionModule;
