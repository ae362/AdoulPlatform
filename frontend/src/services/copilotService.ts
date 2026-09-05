/**
 * Copilot/OpenAI Integration Service
 * للتكامل مع OpenAI API لـ AI Chat Assistant
 */

import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CopilotRequestSchema {
  messages: CopilotMessage[];
  model: string;
  max_tokens: number;
  temperature: number;
}

export interface CopilotResponseSchema {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في توثيق العقود والوثائق العدلية المغربية.

معلومات مهمة:
- أنت تساعد المستخدمين في ملء نموذج توثيق العقود (5 خطوات)
- تتحدث باللغة العربية فقط
- تركز على القانون المغربي والمتطلبات القانونية المحلية
- تقدم نصائح عملية وقانونية

الخطوات الخمسة:
1. اختيار نوع الرسم العدلي (بيع، هبة، مقاسمة، إلخ)
2. معلومات الأطراف (الأسماء، أرقام البطاقات)
3. معلومات الملكية والعقار (النوع، الحدود، الرسم)
4. المعلومات المالية (السعر، طريقة الدفع)
5. التواريخ والتوثيق (التاريخ الميلادي/الهجري، رقم الملف)

المتطلبات القانونية:
- التسجيل الضريبي يجب أن يتم في غضون 15 يوماً
- البطاقات الوطنية يجب أن تكون صالحة (لم تنته صلاحيتها)
- جميع الحدود الأربعة مطلوبة
- السعر يجب أن يكون حقيقياً (لا يسمح بالتلاعب)

نصائح للمساعدة:
- اسأل أسئلة واضحة ومباشرة
- قدم أمثلة عملية
- حذر من الأخطاء الشائعة
- ساعد في فهم المتطلبات القانونية`;

// ============================================================================
// COPILOT SERVICE
// ============================================================================

export class CopilotService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor(apiKey?: string, endpoint?: string, model?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    this.apiEndpoint =
      endpoint || import.meta.env.VITE_OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = model || import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';

    if (!this.apiKey || this.apiKey === 'sk-your-key-here') {
      console.warn('⚠️ OpenAI API key not configured. Chat will use fallback responses.');
    }
  }

  /**
   * Send message to Copilot API
   */
  async sendMessage(userMessage: string, conversationHistory: CopilotMessage[] = []): Promise<string> {
    try {
      // Build messages array
      const messages: CopilotMessage[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      // Prepare request
      const requestBody: CopilotRequestSchema = {
        messages,
        model: this.model,
        max_tokens: 500,
        temperature: 0.7,
      };

      // Make API call
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Copilot API Error:', error);
        throw new Error(`API Error: ${response.status} - ${error.message}`);
      }

      const data: CopilotResponseSchema = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'عذراً، لم أستطع إنشاء إجابة.';

      return assistantMessage;
    } catch (error) {
      console.error('❌ Error calling Copilot API:', error);
      throw error;
    }
  }

  /**
   * Stream message (for real-time responses)
   */
  async streamMessage(
    userMessage: string,
    conversationHistory: CopilotMessage[] = [],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const messages: CopilotMessage[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const requestBody = {
        messages,
        model: this.model,
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      let fullMessage = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || '';
              if (content) {
                fullMessage += content;
                onChunk?.(content);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }

      return fullMessage;
    } catch (error) {
      console.error('❌ Error streaming from Copilot API:', error);
      throw error;
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    if (!this.apiKey) return false;
    if (this.apiKey === 'sk-your-key-here') return false;
    return this.apiKey.length > 0;
  }

  /**
   * Set API Key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get API status
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          model: this.model,
          max_tokens: 1,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ API Status Check Failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let copilotInstance: CopilotService | null = null;

export function getCopilotService(): CopilotService {
  if (!copilotInstance) {
    copilotInstance = new CopilotService();
  }
  return copilotInstance;
}

export function initializeCopilot(apiKey: string, endpoint?: string, model?: string): CopilotService {
  copilotInstance = new CopilotService(apiKey, endpoint, model);
  return copilotInstance;
}
