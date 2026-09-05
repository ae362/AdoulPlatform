import { LegalValidationResult } from '../../../shared';

export class LegalCheckerService {
  async validateLegalRecord(recordType: string, payload: any): Promise<LegalValidationResult> {
    const issues = [] as LegalValidationResult['issues'];
    if (recordType.includes('minor')) {
      issues.push({ level: 'warning', message: 'تحقق من وجود إذن الولي أو المحكمة', field: 'guardianApproval' });
    }
    if (!payload?.inclusion_date) {
      issues.push({ level: 'error', message: 'تاريخ تضمين الرسم مطلوب', field: 'inclusion_date' });
    }
    return { issues };
  }
}
