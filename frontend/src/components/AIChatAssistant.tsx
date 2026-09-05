import React, { useState, useRef, useEffect } from 'react';
import { getCopilotService, type CopilotMessage } from '../services/copilotService';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface AIChatAssistantProps {
  onClose?: () => void;
  context?: {
    step?: number;
    documentType?: string;
    validationAlerts?: any[];
  };
}

// ============================================================================
// AI RESPONSES LIBRARY
// ============================================================================

const AIResponses = {
  greeting: [
    'مرحباً! 👋 أنا مساعدك الذكي في توثيق العقود. كيف يمكنني مساعدتك؟',
    'أهلاً وسهلاً! 🤖 ما الذي تحتاج إلى توثيقه؟',
  ],

  step0: {
    assistant:
      'ما نوع الرسم العدلي الذي تريد إنشاؤه؟ \n\n📋 الخيارات المتاحة:\n• بيع وشراء عقار\n• هبة\n• مقاسمة\n• صدقة\n• رهن عقاري\n• توكيل رسمي',
    suggestions: ['بيع وشراء', 'هبة', 'رهن عقاري', 'توكيل'],
  },

  step1: {
    assistant:
      'الآن دعنا نجمع معلومات الأطراف. 👥\n\nأخبرني:\n1️⃣ الاسم الكامل للطرف الأول (البائع/المتصرف)\n2️⃣ رقم البطاقة الوطنية\n\nتلميح: يجب أن يطابق اسم البطاقة الوطنية تماماً',
    suggestions: ['أدخل البيانات يدوياً', 'ارفع صورة البطاقة للـ OCR'],
  },

  step2: {
    assistant:
      'الآن معلومات الملكية والعقار. 🏠\n\nأحتاج إلى:\n1️⃣ نوع العقار (محفظ/غير محفظ/منقول)\n2️⃣ الحدود الأربعة (شمال، جنوب، شرق، غرب)\n3️⃣ رقم الرسم (إن وجد)\n\n⚠️ تحديد الحدود بدقة يقلل النزاعات المستقبلية',
    suggestions: ['عقار محفظ', 'عقار غير محفظ', 'استفسر عن الحدود'],
  },

  step3: {
    assistant:
      'الآن المعلومات المالية. 💰\n\nأخبرني:\n1️⃣ السعر الإجمالي (بالدرهم)\n2️⃣ طريقة الدفع\n3️⃣ هل تم التسجيل الضريبي؟\n\n🔴 تذكر: التسجيل الضريبي مطلوب في غضون 15 يوماً (القانون المغربي)',
    suggestions: ['نقد', 'شيك', 'تحويل بنكي', 'قسط'],
  },

  step4: {
    assistant:
      'التواريخ والتوثيق. 📅\n\nأحتاج إلى:\n1️⃣ التاريخ الميلادي\n2️⃣ رقم الملف\n3️⃣ أسماء العدول الموثقين\n\nسيتم تحويل التاريخ الميلادي إلى هجري تلقائياً',
    suggestions: ['أدخل التاريخ', 'استخدم التاريخ الحالي'],
  },

  step5: {
    assistant:
      'مراجعة نهائية! ✓\n\nتحقق من جميع البيانات وأكملها.\n\n📥 بعد التحقق:\n• اضغط "تنزيل الوثيقة"\n• ستحصل على PDF رسمي\n• جاهز للطباعة والتوقيع',
    suggestions: ['راجع البيانات', 'نزّل الوثيقة'],
  },

  validation: {
    idNumber: 'رقم البطاقة يجب أن يكون 10 أرقام فقط. هل يمكنك التحقق؟',
    price:
      'السعر يبدو منخفضاً جداً. هل هذا صحيح فعلاً؟ قد يعرضك للمساءلة القانونية.',
    boundaries:
      'جميع الحدود الأربعة مطلوبة. هل يمكنك إضافة الحدود الناقصة؟',
    taxRegistration:
      '⚠️ تذكيرر: يجب التسجيل الضريبي في غضون 15 يوماً من توثيق العقد.',
  },

  help: {
    ocr: 'يمكنك رفع صورة البطاقة الوطنية أو وثيقة الملكية. سأستخرج البيانات تلقائياً باستخدام الـ OCR.',
    hijri:
      'التواريخ الهجرية تُحسب تلقائياً من التواريخ الميلادية. سأتولى ذلك عنك.',
    download:
      'الملف سينزل بصيغة PDF رسمية جاهزة للطباعة والتوقيع من قبل العدول.',
  },

  errors: [
    'آسف، لم أفهم سؤالك. هل يمكنك إعادة الصياغة؟',
    'دعني أساعدك بشكل أفضل. هل تقصد...؟',
    'يبدو أن هناك خطأ. هل تريد أن تحاول مرة أخرى؟',
  ],
};

// ============================================================================
// AI CHAT COMPONENT
// ============================================================================

export function AIChatAssistant({ onClose, context }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useCopilot, setUseCopilot] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copilotService = getCopilotService();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: AIResponses.greeting[Math.floor(Math.random() * AIResponses.greeting.length)],
        timestamp: new Date(),
        suggestions: ['ابدأ من الخطوة الأولى', 'أرني الأسئلة الشائعة', 'ساعدني في الملء'],
      };
      setMessages([greeting]);
    }
  }, [isOpen, messages.length]);

  // Handle user message
  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setApiError(null);

    try {
      // Check if we should use Copilot
      const shouldUseCopilot = copilotService.isConfigured();
      setUseCopilot(shouldUseCopilot);

      let responseText = '';

      if (shouldUseCopilot) {
        // Convert messages to Copilot format
        const copilotMessages: CopilotMessage[] = messages
          .filter((m) => m.role !== 'assistant' || m.content)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        try {
          responseText = await copilotService.sendMessage(text, copilotMessages);
        } catch (error: any) {
          console.error('Copilot API error:', error);
          setApiError(error.message);
          responseText = `عذراً، حدث خطأ في الاتصال مع الخدمة الذكية. ${error.message}`;
        }
      } else {
        // Fallback to generated response
        responseText = generateAssistantResponse(text, context).content;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setApiError('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI response based on user input
  const generateAssistantResponse = (userText: string, ctx: any = {}): ChatMessage => {
    let response = '';
    let suggestions: string[] = [];

    const lowerText = userText.toLowerCase();

    // Detect intent
    if (
      lowerText.includes('بيع') ||
      lowerText.includes('شراء') ||
      lowerText.includes('نوع')
    ) {
      response = AIResponses.step0.assistant;
      suggestions = AIResponses.step0.suggestions;
    } else if (
      lowerText.includes('اسم') ||
      lowerText.includes('بطاقة') ||
      lowerText.includes('أطراف')
    ) {
      response = AIResponses.step1.assistant;
      suggestions = AIResponses.step1.suggestions;
    } else if (
      lowerText.includes('عقار') ||
      lowerText.includes('ملك') ||
      lowerText.includes('حدود')
    ) {
      response = AIResponses.step2.assistant;
      suggestions = AIResponses.step2.suggestions;
    } else if (
      lowerText.includes('سعر') ||
      lowerText.includes('دفع') ||
      lowerText.includes('ضريبة')
    ) {
      response = AIResponses.step3.assistant;
      suggestions = AIResponses.step3.suggestions;
    } else if (
      lowerText.includes('تاريخ') ||
      lowerText.includes('ملف') ||
      lowerText.includes('عدول')
    ) {
      response = AIResponses.step4.assistant;
      suggestions = AIResponses.step4.suggestions;
    } else if (
      lowerText.includes('مراجعة') ||
      lowerText.includes('نهائي') ||
      lowerText.includes('تنزيل')
    ) {
      response = AIResponses.step5.assistant;
      suggestions = AIResponses.step5.suggestions;
    } else if (
      lowerText.includes('كيف') ||
      lowerText.includes('ساعدني') ||
      lowerText.includes('شرح')
    ) {
      response =
        '📚 يمكنني مساعدتك بـ:\n\n1️⃣ شرح الخطوات خطوة بخطوة\n2️⃣ الإجابة على الأسئلة القانونية\n3️⃣ التحقق من البيانات\n4️⃣ معالجة الوثائق والصور\n\nما الذي تحتاج إليه؟';
      suggestions = ['شرح الخطوات', 'أسئلة قانونية', 'التحقق من البيانات'];
    } else if (lowerText.includes('ocr') || lowerText.includes('صورة')) {
      response = AIResponses.help.ocr;
      suggestions = ['ارفع صورة البطاقة', 'ارفع وثيقة الملكية'];
    } else if (lowerText.includes('هجري')) {
      response = AIResponses.help.hijri;
      suggestions = ['ادخل التاريخ الميلادي'];
    } else if (lowerText.includes('pdf') || lowerText.includes('تنزيل')) {
      response = AIResponses.help.download;
      suggestions = ['عد إلى الخطوة 5', 'أكمل الملء'];
    } else {
      // Default response
      response =
        'شكراً على سؤالك! 👂\n\nيمكنك سؤالي عن:\n• خطوات الملء\n• المتطلبات القانونية\n• كيفية استخدام الـ OCR\n• تحويل التواريخ\n• تنزيل الوثائق\n\nما الذي تود معرفته؟';
      suggestions = [
        'الخطوات',
        'المتطلبات',
        'الـ OCR',
        'التواريخ',
      ];
    }

    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      suggestions,
    };
  };

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all z-40 flex items-center justify-center text-2xl"
          title="فتح المساعد الذكي"
        >
          🤖
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[500px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">🤖 المساعد الذكي</h3>
              <p className="text-xs text-blue-100">مساعدك في توثيق العقود</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              className="text-white hover:bg-blue-700 rounded-lg p-2 transition flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* API Status & Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 mx-4 mt-2 rounded-lg flex justify-between items-center">
              <span className="text-sm">{apiError}</span>
              <button
                onClick={() => setApiError(null)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {useCopilot && !apiError && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-1 mx-4 text-xs rounded">
              ✓ متصل بخدمة الذكاء الاصطناعي
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Suggestions - only for assistant */}
                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full transition bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder="اكتب سؤالك هنا..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl transition font-semibold"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
