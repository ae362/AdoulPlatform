import { Ollama } from 'ollama';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { OCRResult } from '../../../shared';

// Ollama client
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
});

// Google Cloud Vision client
let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    // If using API key, we won't initialize the client library (we'll use REST)
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (apiKey) return null as unknown as ImageAnnotatorClient;

    // Fallback: try credentials from env JSON or ADC
    const credentials = process.env.GOOGLE_VISION_CREDENTIALS;
    if (credentials) {
      visionClient = new ImageAnnotatorClient({
        credentials: JSON.parse(credentials),
      });
    } else {
      // Last fallback: use GOOGLE_APPLICATION_CREDENTIALS file path / ADC
      visionClient = new ImageAnnotatorClient();
    }
  }
  return visionClient;
}

interface VisionExtractionResult {
  husband_name?: string;
  husband_cin?: string;
  husband_birth_date?: string;
  husband_nationality?: string;
  husband_residence?: string;
  wife_name?: string;
  wife_cin?: string;
  wife_birth_date?: string;
  wife_nationality?: string;
  wife_residence?: string;
  [key: string]: string | undefined;
}

export class VisionService {
  private model = process.env.OLLAMA_VISION_MODEL || 'gpt-oss:120b-cloud'; // Text LLM for structuring
  
  /**
   * Extract structured data from multiple documents (ID cards, medical docs, etc.)
   * for marriage record creation
   */
  async extractMarriageDocuments(
    documents: Array<{ buffer: Buffer; subject: 'husband' | 'wife' | 'other'; filename: string }>
  ): Promise<{ extractedData: VisionExtractionResult; rawTexts: Record<string, string> }> {
    const extractedData: VisionExtractionResult = {};
    const rawTexts: Record<string, string> = {};

    // Process each document
    for (const doc of documents) {
      try {
        const base64Image = doc.buffer.toString('base64');
        const result = await this.analyzeDocument(base64Image, doc.subject);
        
        // Store raw text
        rawTexts[doc.filename] = result.rawText;
        
        // Merge extracted fields based on subject
        if (doc.subject === 'husband' || doc.subject === 'wife') {
          const prefix = doc.subject === 'husband' ? 'husband_' : 'wife_';
          if (result.detectedFields.name) extractedData[`${prefix}name`] = result.detectedFields.name;
          if (result.detectedFields.cin) extractedData[`${prefix}cin`] = result.detectedFields.cin;
          if (result.detectedFields.birth_date) extractedData[`${prefix}birth_date`] = result.detectedFields.birth_date;
          if (result.detectedFields.nationality) extractedData[`${prefix}nationality`] = result.detectedFields.nationality;
          if (result.detectedFields.residence) extractedData[`${prefix}residence`] = result.detectedFields.residence;
        }
      } catch (error) {
        console.error(`Error processing ${doc.filename}:`, error);
        rawTexts[doc.filename] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return { extractedData, rawTexts };
  }

  /**
   * Analyze a single document image using Google Cloud Vision API + LLM
   * Step 1: Extract text using Google Cloud Vision (excellent for all languages)
   * Step 2: Use LLM to structure the extracted text into JSON
   */
  private async analyzeDocument(
    base64Image: string,
    subject: 'husband' | 'wife' | 'other'
  ): Promise<OCRResult> {
    try {
      // Step 1: Extract text using Google Cloud Vision API (API key via REST or client lib)
      console.log('Starting Google Cloud Vision extraction...');
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      let extractedText = '';

      if (apiKey) {
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        const body = {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              imageContext: { languageHints: ['ar', 'fr', 'en'] },
            },
          ],
        } as any;

        const fetchFn: any = (globalThis as any).fetch;
        if (!fetchFn) {
          throw new Error('fetch is not available in this Node runtime');
        }
        const resp = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Vision REST error ${resp.status}: ${text}`);
        }
        const json = await resp.json();
        const first = json?.responses?.[0];
        extractedText = first?.fullTextAnnotation?.text || first?.textAnnotations?.[0]?.description || '';
      } else {
        const client = getVisionClient();
        const [result] = await client.textDetection({ image: { content: base64Image } });
        const detections = result.textAnnotations;
        extractedText = detections && detections.length > 0 ? detections[0].description || '' : '';
      }
      
      console.log('Vision API extracted text length:', extractedText.length);
      console.log('Vision API extracted text:', extractedText);
      
      if (!extractedText || extractedText.length < 10) {
        console.warn('Vision API extracted very little text');
        return {
          rawText: extractedText,
          detectedFields: {},
        };
      }

      // Step 2: Use LLM to structure the extracted text
      console.log('Sending to LLM for structuring...');
      const prompt = this.buildLLMPrompt(extractedText, subject);
      
      const response = await ollama.generate({
        model: this.model,
        prompt,
        options: {
          temperature: 0.1,
        },
      });

      const llmResponse = response.response || '';
      console.log('LLM response:', llmResponse);
      
      const detectedFields = this.parseVisionResponse(llmResponse);

      return {
        rawText: extractedText,
        detectedFields,
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for LLM to structure OCR-extracted text
   */
  private buildLLMPrompt(ocrText: string, subject: 'husband' | 'wife' | 'other'): string {
    return `أنت تحلل نصاً مستخرجاً من بطاقة التعريف الوطنية المغربية.

النص المستخرج من OCR:
"""
${ocrText}
"""

ملاحظة مهمة: 
- إذا كانت هذه بطاقة تعريف وطنية مغربية: الاسم الكامل بالأحرف العربية يظهر في الزاوية اليمنى العليا (الاسم العائلي + الاسم الشخصي).
- ابحث عن الاسم المكتوب بالعربية في أعلى يمين البطاقة.

مهمتك: استخراج المعلومات التالية وتنظيمها في JSON:
- name: الاسم الكامل بالأحرف العربية فقط من الزاوية اليمنى العليا (الاسم العائلي + الاسم الشخصي مجتمعين). لا تستخدم النسخة الفرنسية أو اللاتينية من الاسم.
- cin: رقم البطاقة الوطنية (مثل AB123456 أو L289519)
- birth_date: تاريخ الازدياد بصيغة YYYY-MM-DD
- nationality: الجنسية بالعربية (مثل المغربية، مغربي)
- residence: العنوان أو المدينة بالعربية (الحي الاداري)

مهم جداً: استخدم فقط الأحرف العربية للاسم، وليس الأحرف اللاتينية (Nom/Prénom).

أرجع فقط JSON صحيح. إذا لم يتم العثور على حقل، احذفه.

JSON:`;
  }

  /**
   * Build prompt for vision model to analyze document image directly
   */
  private buildVisionPrompt(subject: 'husband' | 'wife' | 'other'): string {
    return `What text do you see in this image? List all visible text including:
- Any names
- Any ID numbers or reference numbers
- Any dates
- Any addresses or locations
- Any other text

Just describe what you actually see in the image.`;
  }

  /**
   * Parse the vision model response and extract JSON fields
   */
  private parseVisionResponse(response: string): Record<string, string> {
    console.log('Vision model raw response:', response);
    
    try {
      // Try to find JSON block in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Clean up and validate fields
        const cleaned: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string' && value.trim()) {
            cleaned[key] = value.trim();
          }
        }

        // Heuristic: combine first/last name variants if present
        const firstName =
          cleaned.first_name ||
          cleaned.firstname ||
          cleaned.firstName ||
          cleaned.prenom ||
          cleaned.Prénom ||
          (parsed as any)['الاسم الشخصي'];
        const lastName =
          cleaned.last_name ||
          cleaned.lastname ||
          cleaned.lastName ||
          cleaned.nom ||
          (parsed as any)['الاسم العائلي'];
        if (!cleaned.name && (firstName || lastName)) {
          const full = [lastName, firstName].filter(Boolean).join(' ').trim();
          if (full) cleaned.name = full;
        }

        return cleaned;
      }
    } catch (error) {
      console.error('Failed to parse vision response as JSON:', error);
    }

    // Fallback: try to extract fields using regex from the raw text response
    return this.extractFieldsFromText(response);
  }

  /**
   * Fallback method to extract fields from unstructured text
   */
  private extractFieldsFromText(text: string): Record<string, string> {
    const fields: Record<string, string> = {};
    
    console.log('Attempting to extract fields from text:', text);

    // Try explicit labels first (Arabic & French)
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    function afterLabel(labelRegex: RegExp): string | undefined {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (labelRegex.test(line)) {
          // Value may be on same line (after colon) or the next non-empty line
          const sameLine = line.split(/[:：]/).slice(1).join(':').trim();
          if (sameLine && /[\u0600-\u06FFA-Za-z]/.test(sameLine)) return sameLine;
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const candidate = lines[j];
            if (candidate && /[\u0600-\u06FFA-Za-z]/.test(candidate)) return candidate;
          }
        }
      }
      return undefined;
    }

    // Look for Arabic name fields ONLY (ignore French)
    const arabicFirst = afterLabel(/الاسم\s*الشخصي/);
    const arabicLast = afterLabel(/الاسم\s*العائلي/);

    if (arabicFirst || arabicLast) {
      // Combine last + first in Arabic order
      const full = [arabicLast, arabicFirst].filter(Boolean).join(' ').trim();
      if (full) {
        // Ensure it's actually Arabic text
        if (/[\u0600-\u06FF]/.test(full)) {
          fields.name = full;
        }
      }
    }

    // If still no name, pick the best Arabic candidate line (exclude obvious non-name phrases)
    if (!fields.name) {
      const blacklist = [
        'المملكة المغربية', 'الجنسية', 'المغربية', 'المغرب', 'بطاقة', 'مسلم', 'قاصر',
        'الحي', 'الاداري', 'الإداري', 'شارع', 'زنقة', 'طريق', 'مدينة', 'إقليم', 'عمالة', 'جماعة',
        'تاريخ', 'الازدياد', 'مكان', 'القامة', 'الصلاحية', 'رقم'
      ];
      const arabicOnlyLines = lines.filter((l) => /[\u0600-\u06FF]/.test(l) && !/\d/.test(l));
      const candidates = arabicOnlyLines.filter((l) => !blacklist.some((w) => l.includes(w)));
      // Pick the longest candidate that has at least 2 words
      const best = candidates
        .filter((l) => l.split(/\s+/).length >= 2)
        .sort((a, b) => b.length - a.length)[0];
      if (best) {
        fields.name = best.trim();
      }
    }

    // Extract CIN - more flexible pattern
    const cinMatch = text.match(/\b([A-Z]{1,2}\d{4,7})\b/i);
    if (cinMatch) fields.cin = cinMatch[1].toUpperCase();

    // Extract birth date - multiple formats
    const datePatterns = [
      /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/,  // YYYY-MM-DD or YYYY/MM/DD
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/,  // DD-MM-YYYY or DD/MM/YYYY
      /\b(\d{2}\.\d{2}\.\d{4})\b/,            // DD.MM.YYYY
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let date = match[1];
        // Convert to YYYY-MM-DD if needed
        if (date.includes('/') || date.includes('-')) {
          const parts = date.split(/[-\/]/);
          if (parts[0].length === 4) {
            // Already YYYY-MM-DD format
            date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else if (parts[2].length === 4) {
            // DD-MM-YYYY format
            date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else if (date.includes('.')) {
          const parts = date.split('.');
          date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        fields.birth_date = date;
        break;
      }
    }

    // Extract nationality (look for مغربي or similar)
    const natMatches = text.match(/(مغرب|مغربي|مغربية|Moroccan|Marocain)/i);
    if (natMatches) fields.nationality = natMatches[0];

    // Extract any address-like text (Arabic text with numbers/commas)
    const addressMatch = text.match(/[\u0600-\u06FF\s\d,.-]{10,}/);
    if (addressMatch) {
      const addr = addressMatch[0].trim();
      if (!fields.name || !fields.name.includes(addr)) fields.residence = addr;
    }
    
    console.log('Extracted fields:', fields);

    return fields;
  }

  /**
   * Check if Google Cloud Vision + LLM service is available
   */
  async checkAvailability(): Promise<{ available: boolean; model: string; provider: string; error?: string }> {
    try {
      // Check if Google Cloud Vision is configured (API key or ADC)
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      if (!apiKey) {
        try {
          const client = getVisionClient();
          if (client && (client as any).getProjectId) {
            await client.getProjectId();
          }
        } catch (visionError) {
          return {
            available: false,
            model: this.model,
            provider: 'Google Cloud Vision + Ollama LLM',
            error: `Google Cloud Vision not configured. Set GOOGLE_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS / GOOGLE_VISION_CREDENTIALS.`,
          };
        }
      }

      // Check if Ollama is available
      const models = await ollama.list();
      const hasModel = models.models.some((m) => 
        m.name.includes('gpt-oss') || 
        m.name.includes('qwen') || 
        m.name.includes('llama')
      );

      if (!hasModel) {
        return {
          available: false,
          model: this.model,
          provider: 'Google Cloud Vision + Ollama LLM',
          error: `No suitable LLM found. Please run: ollama pull ${this.model}`,
        };
      }

      return {
        available: true,
        model: `Google Cloud Vision + ${this.model}`,
        provider: apiKey ? 'Hybrid (Vision REST + LLM)' : 'Hybrid (Vision Client + LLM)',
      };
    } catch (error) {
      return {
        available: false,
        model: this.model,
        provider: 'Google Cloud Vision + Ollama LLM',
        error: `Service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
