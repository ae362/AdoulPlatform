/**
 * اختبارات الوحدة (Unit Tests) للوكيل الذكي
 * FeesAgent AI Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMoroccanIDNumber,
  validateIDExpiryDate,
  validatePropertyData,
  validatePrice,
  compareWithOCR,
  generateTaxRegistrationClause,
  generateThirdPartyRightsClause,
  generatePropertyStatusClause,
} from '../services/feesAgentAI';

// ============================================================================
// 1. اختبارات التحقق من البيانات
// ============================================================================

describe('Moroccan ID Number Validation', () => {
  it('should accept valid 10-digit ID numbers', () => {
    const result = validateMoroccanIDNumber('1234567890');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-numeric ID numbers', () => {
    const result = validateMoroccanIDNumber('abcd567890');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.message).toContain('10 أرقام');
  });

  it('should reject IDs shorter than 10 digits', () => {
    const result = validateMoroccanIDNumber('12345');
    expect(result.isValid).toBe(false);
  });

  it('should warn about invalid checksums', () => {
    const result = validateMoroccanIDNumber('1111111111');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should accept edge case: 0000000000', () => {
    const result = validateMoroccanIDNumber('0000000000');
    expect(result.isValid).toBe(true); // صيغة صحيحة
  });
});

describe('ID Expiry Date Validation', () => {
  it('should reject expired ID cards', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    const expiryDateStr = pastDate.toISOString().split('T')[0];

    const result = validateIDExpiryDate('2010-01-01', expiryDateStr);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.message).toContain('منتهية');
  });

  it('should warn about expiry dates within 3 months', () => {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 2);
    const expiryDateStr = soon.toISOString().split('T')[0];

    const result = validateIDExpiryDate('2010-01-01', expiryDateStr);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.message).toContain('3 أشهر');
  });

  it('should reject if issue date is after expiry date', () => {
    const result = validateIDExpiryDate('2025-01-01', '2020-01-01');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.severity).toBe('خطأ');
  });

  it('should accept valid future expiry dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    const expiryDateStr = future.toISOString().split('T')[0];

    const result = validateIDExpiryDate('2020-01-01', expiryDateStr);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('Property Data Validation', () => {
  it('should accept complete property data', () => {
    const boundaries = { north: 'شارع', south: 'شارع', east: 'شارع', west: 'شارع' };
    const result = validatePropertyData('محفظ', boundaries, 'أ/123/456');
    expect(result.isValid).toBe(true);
  });

  it('should reject incomplete boundaries', () => {
    const boundaries = { north: 'شارع', south: '', east: 'شارع', west: 'شارع' };
    const result = validatePropertyData('محفظ', boundaries, 'أ/123/456');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.message).toContain('مفقودة');
  });

  it('should warn about unregistered properties without title ref', () => {
    const boundaries = { north: 'شارع', south: 'شارع', east: 'شارع', west: 'شارع' };
    const result = validatePropertyData('غير_محفظ', boundaries, '');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.suggestion).toContain('الشهود');
  });

  it('should accept movable properties without boundaries', () => {
    const boundaries = { north: '', south: '', east: '', west: '' };
    const result = validatePropertyData('منقول', boundaries, '');
    expect(result.isValid).toBe(true);
  });
});

describe('Price Validation', () => {
  it('should accept positive prices', () => {
    const result = validatePrice(100000, 'محفظ');
    expect(result.isValid).toBe(true);
  });

  it('should reject zero price', () => {
    const result = validatePrice(0, 'محفظ');
    expect(result.isValid).toBe(false);
  });

  it('should reject negative prices', () => {
    const result = validatePrice(-50000, 'محفظ');
    expect(result.isValid).toBe(false);
  });

  it('should warn about suspiciously low prices for real estate', () => {
    const result = validatePrice(25000, 'محفظ');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.message).toContain('التهرب');
  });

  it('should warn about extremely high prices', () => {
    const result = validatePrice(50000000, 'محفظ');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should accept low prices for movables', () => {
    const result = validatePrice(5000, 'منقول');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

// ============================================================================
// 2. اختبارات المقارنة مع OCR
// ============================================================================

describe('OCR Comparison', () => {
  it('should match identical strings', () => {
    const comparison = compareWithOCR('محمد أحمد علي', 'محمد أحمد علي');
    expect(comparison.match).toBe(true);
    expect(comparison.similarity).toBeGreaterThan(0.95);
  });

  it('should match strings with minor differences', () => {
    const comparison = compareWithOCR('محمد أحمد علي', 'محمد احمد علي');
    expect(comparison.match).toBe(true); // تشابه > 85%
    expect(comparison.similarity).toBeGreaterThan(0.85);
  });

  it('should reject completely different strings', () => {
    const comparison = compareWithOCR('محمد أحمد علي', 'فاطمة محمود حسن');
    expect(comparison.match).toBe(false);
    expect(comparison.similarity).toBeLessThan(0.5);
  });

  it('should handle spaces and punctuation', () => {
    const comparison = compareWithOCR(
      'محمد - أحمد - علي',
      'محمد أحمد علي'
    );
    expect(comparison.match).toBe(true); // تشابه عالي رغم الفروقات
  });

  it('should report issues for non-matches', () => {
    const comparison = compareWithOCR(
      'محمد',
      'علي'
    );
    expect(comparison.issues.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. اختبارات توليد النصوص القانونية
// ============================================================================

describe('Legal Text Generation - Tax Clause', () => {
  it('should generate registration completed clause for "نعم"', () => {
    const clause = generateTaxRegistrationClause('نعم');
    expect(clause).toContain('تم التسجيل');
    expect(clause).toContain('مصلحة التسجيل');
    expect(clause).not.toContain('يلتزم الطرفان');
  });

  it('should generate mandatory registration clause for "لا"', () => {
    const clause = generateTaxRegistrationClause('لا');
    expect(clause).toContain('يلتزم الطرفان');
    expect(clause).toContain('15 يوم');
    expect(clause).toContain('غرامات');
  });

  it('should contain legal references', () => {
    const clause = generateTaxRegistrationClause('لا');
    expect(clause).toContain('القانون');
  });
});

describe('Legal Text Generation - Third Party Rights', () => {
  it('should generate clean property clause for "لا"', () => {
    const clause = generateThirdPartyRightsClause('لا');
    expect(clause).toContain('خالٍ من');
    expect(clause).toContain('حقوق الغير');
  });

  it('should generate encumbered property clause for "نعم"', () => {
    const clause = generateThirdPartyRightsClause('نعم', 'رهن للبنك ABC');
    expect(clause).toContain('رهن للبنك ABC');
    expect(clause).toContain('يقبل المشتري');
  });

  it('should use provided details for "نعم"', () => {
    const details = 'رهن عقاري ورقة كفالة';
    const clause = generateThirdPartyRightsClause('نعم', details);
    expect(clause).toContain(details);
  });
});

describe('Legal Text Generation - Property Status', () => {
  it('should generate registered property clause', () => {
    const clause = generatePropertyStatusClause('محفظ', 'أ/123/456');
    expect(clause).toContain('محفظ');
    expect(clause).toContain('أ/123/456');
  });

  it('should generate unregistered property clause', () => {
    const clause = generatePropertyStatusClause('غير_محفظ');
    expect(clause).toContain('غير محفظ');
    expect(clause).toContain('إقرار من الشهود');
    expect(clause).toContain('سنة واحدة');
  });

  it('should generate movable property clause', () => {
    const clause = generatePropertyStatusClause('منقول');
    expect(clause).toContain('منقول');
  });

  it('should include legal requirements for unregistered properties', () => {
    const clause = generatePropertyStatusClause('غير_محفظ');
    expect(clause).toContain('الحيازة الفعلية');
    expect(clause).toContain('الاستغلال');
  });
});

// ============================================================================
// 4. اختبارات متكاملة (Integration Tests)
// ============================================================================

describe('Integration: Complete Document Workflow', () => {
  it('should complete a full cycle for registered property sale', () => {
    // 1. التحقق من البيانات
    const idValidation = validateMoroccanIDNumber('1234567890');
    expect(idValidation.isValid).toBe(true);

    // 2. التحقق من الملكية
    const boundaries = {
      north: 'شارع النيل',
      south: 'شارع التقدم',
      east: 'شارع الأمل',
      west: 'شارع الحياة',
    };
    const propertyValidation = validatePropertyData('محفظ', boundaries, 'أ/100/200');
    expect(propertyValidation.isValid).toBe(true);

    // 3. التحقق من السعر
    const priceValidation = validatePrice(500000, 'محفظ');
    expect(priceValidation.isValid).toBe(true);

    // 4. توليد النصوص
    const taxClause = generateTaxRegistrationClause('نعم');
    expect(taxClause).toContain('تم التسجيل');

    // النتيجة: جميع الفحوصات نجحت ✓
    expect(idValidation.isValid && propertyValidation.isValid && priceValidation.isValid).toBe(true);
  });

  it('should handle unregistered property with warnings', () => {
    // 1. التحقق من الملكية غير المسجلة
    const boundaries = {
      north: 'شارع',
      south: 'شارع',
      east: 'شارع',
      west: 'شارع',
    };
    const propertyValidation = validatePropertyData('غير_محفظ', boundaries, '');

    // 2. التحقق من السعر المنخفض
    const priceValidation = validatePrice(30000, 'محفظ');

    // 3. توليد النصوص مع بنود إضافية
    const propertyClause = generatePropertyStatusClause('غير_محفظ');

    // النتيجة: تحذيرات متعددة
    expect(propertyValidation.warnings.length).toBeGreaterThan(0);
    expect(priceValidation.warnings.length).toBeGreaterThan(0);
    expect(propertyClause).toContain('الشهود');
  });
});

// ============================================================================
// 5. اختبارات الحالات الحدية (Edge Cases)
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty strings gracefully', () => {
    const result = validateMoroccanIDNumber('');
    expect(result.isValid).toBe(false);
  });

  it('should handle very long IDs', () => {
    const longId = '123456789012345678901234567890';
    const result = validateMoroccanIDNumber(longId);
    expect(result.isValid).toBe(false);
  });

  it('should compare very similar names correctly', () => {
    const comparison = compareWithOCR('احمد', 'أحمد');
    expect(comparison.match).toBe(true);
  });

  it('should validate date at midnight', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const dateStr = midnight.toISOString().split('T')[0];

    const result = validateIDExpiryDate('2020-01-01', dateStr);
    expect(result.isValid).toBe(true);
  });

  it('should handle price exactly at boundary', () => {
    const result = validatePrice(50000, 'محفظ');
    expect(result.isValid).toBe(true);
    // قد يكون هناك تحذير أو لا
  });
});

// ============================================================================
// 6. اختبارات الأداء (Performance)
// ============================================================================

describe('Performance', () => {
  it('should validate ID in < 10ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      validateMoroccanIDNumber('1234567890');
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // 100 x 10ms = 1000ms
  });

  it('should compare strings in < 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      compareWithOCR('محمد أحمد علي', 'محمد احمد علي');
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(5000); // 100 x 50ms
  });
});
