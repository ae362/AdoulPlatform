export interface NationalIdData {
  cin: string;
  fullName?: string;
  birthDate?: string;
  address?: string;
  gender?: 'M' | 'F' | null;
}

export class RFIDService {
  async readNationalIdFromRFID(): Promise<NationalIdData> {
    return {
      cin: 'RFID-MOCK-123',
      fullName: 'مستخدم تجريبي',
      birthDate: '1990-01-01',
      address: 'الدار البيضاء',
      gender: 'M',
    };
  }
}
