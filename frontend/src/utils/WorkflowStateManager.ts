/**
 * 9-Phase Notary Deed Signing Workflow
 * Each phase is mandatory and sequential - no phase can be skipped
 */

export type WorkflowPhase = 
  | 'audit_and_inclusion'          // Phase 1: التدقيق والتضمين
  | 'signature_portal_entry'       // Phase 2: الانتقال لرواق التوقيع
  | 'first_notary_signature'       // Phase 3: توقيع العدل الأول
  | 'second_notary_signature'      // Phase 3.5: توقيع العدل الثاني
  | 'lock_and_fingerprint'         // Phase 4: قفل النسخة والبصمة
  | 'letter_template_preparation'  // Phase 5: تجهيز الخطاب
  | 'security_strip_insertion'     // Phase 6: إدراج الشريط السفلي
  | 'qr_generation'                // Phase 7: توليد QR
  | 'secure_archiving'             // Phase 8: الأرشفة المؤمنة
  | 'final_output'                 // Phase 9: الإرسال/الطباعة
  | 'completed';                   // Final state

export interface WorkflowSignature {
  notaryId: string;
  notaryName: string;
  notaryEmail: string;
  notaryPhone: string;
  signatureDataUrl: string; // Base64 image
  timestamp: string; // ISO string
  deviceAddress: string; // MAC address
  ipAddress: string; // Internal IP
}

export interface WorkflowSecurityLog {
  phase: WorkflowPhase;
  timestamp: string;
  action: string;
  userId: string;
  details: Record<string, any>;
}

export interface DeedVersionControl {
  id: string;
  versionNumber: number;
  parentVersionId?: string; // Reference to previous version
  phase: WorkflowPhase;
  timestamp: string;
  description: string; // e.g., "Pre-letter version", "Post-letter version"
}

export interface WorkflowState {
  deedId: string;
  currentPhase: WorkflowPhase;
  
  // Phase 3-4: Signatures
  firstNotarySignature?: WorkflowSignature;
  secondNotarySignature?: WorkflowSignature;
  
  // Phase 4: Digital Fingerprint
  digitalHash?: string; // SHA-256
  internalTimestamps?: {
    firstNotarySignTime?: string;
    secondNotarySignTime?: string;
    lockTime?: string;
    stripInsertionTime?: string;
  };
  
  // Phase 5-6: Letter & Strip
  letterTemplateApplied?: boolean;
  securityStripData?: {
    qrCode: string;
    documentReference: any;
    notaryData: any;
    segmentData: any;
  };
  
  // Phase 7: QR
  qrCodeUrl?: string;
  
  // Archive Data
  preLetterVersionId?: string;
  postLetterVersionId?: string;
  versionControl?: DeedVersionControl[];
  
  // Security
  isLocked?: boolean;
  securityLog?: WorkflowSecurityLog[];
  
  // Status
  isSigned?: boolean;
  isAddressed?: boolean;
  isArchived?: boolean;
}

/**
 * Strict Workflow State Manager
 * Enforces sequential phase progression
 */
export class WorkflowStateManager {
  private state: WorkflowState;
  private phaseSequence: WorkflowPhase[] = [
    'audit_and_inclusion',
    'signature_portal_entry',
    'first_notary_signature',
    'second_notary_signature',
    'lock_and_fingerprint',
    'letter_template_preparation',
    'security_strip_insertion',
    'qr_generation',
    'secure_archiving',
    'final_output',
    'completed',
  ];

  constructor(deedId: string) {
    this.state = {
      deedId,
      currentPhase: 'audit_and_inclusion',
      securityLog: [],
      versionControl: [],
    };
  }

  /**
   * Get current state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * Validate phase transition
   * Returns true only if moving to the next sequential phase
   */
  canTransitionToPhase(targetPhase: WorkflowPhase): boolean {
    const currentIndex = this.phaseSequence.indexOf(this.state.currentPhase);
    const targetIndex = this.phaseSequence.indexOf(targetPhase);

    // Can only move to next phase (no skipping)
    if (targetIndex !== currentIndex + 1) {
      console.warn(
        `❌ Cannot transition from ${this.state.currentPhase} to ${targetPhase}. ` +
        `Must proceed sequentially.`
      );
      return false;
    }

    return true;
  }

  /**
   * Transition to next phase (with validation)
   */
  transitionToPhase(targetPhase: WorkflowPhase, actionDescription: string): boolean {
    if (!this.canTransitionToPhase(targetPhase)) {
      return false;
    }

    this.state.currentPhase = targetPhase;
    this.logSecurityEvent(targetPhase, actionDescription, {});
    return true;
  }

  /**
   * Record first notary signature
   */
  recordFirstNotarySignature(signature: WorkflowSignature): void {
    if (this.state.currentPhase !== 'first_notary_signature') {
      throw new Error(`Cannot sign: Current phase is ${this.state.currentPhase}`);
    }
    this.state.firstNotarySignature = signature;
    this.state.internalTimestamps = {
      ...this.state.internalTimestamps,
      firstNotarySignTime: signature.timestamp,
    };
    this.logSecurityEvent('first_notary_signature', 'First notary signature captured', {
      notary: signature.notaryName,
      device: signature.deviceAddress,
      ip: signature.ipAddress,
    });
  }

  /**
   * Record second notary signature
   */
  recordSecondNotarySignature(signature: WorkflowSignature): void {
    if (this.state.currentPhase !== 'second_notary_signature') {
      throw new Error(`Cannot sign: Current phase is ${this.state.currentPhase}`);
    }
    if (!this.state.firstNotarySignature) {
      throw new Error('First notary must sign before second notary');
    }
    this.state.secondNotarySignature = signature;
    this.state.internalTimestamps = {
      ...this.state.internalTimestamps,
      secondNotarySignTime: signature.timestamp,
    };
    this.logSecurityEvent('second_notary_signature', 'Second notary signature captured', {
      notary: signature.notaryName,
      device: signature.deviceAddress,
      ip: signature.ipAddress,
    });
  }

  /**
   * Generate digital fingerprint after both signatures
   */
  async generateDigitalFingerprint(pdfContent: string | ArrayBuffer): Promise<string> {
    if (this.state.currentPhase !== 'lock_and_fingerprint') {
      throw new Error(`Cannot generate fingerprint: Current phase is ${this.state.currentPhase}`);
    }
    if (!this.state.firstNotarySignature || !this.state.secondNotarySignature) {
      throw new Error('Both notaries must sign before generating fingerprint');
    }

    // Generate SHA-256 hash using Web Crypto API
    const data: BufferSource = typeof pdfContent === 'string'
      ? new TextEncoder().encode(pdfContent)
      : (pdfContent as BufferSource);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    this.state.digitalHash = hash;
    this.state.isLocked = true;
    this.state.internalTimestamps = {
      ...this.state.internalTimestamps,
      lockTime: new Date().toISOString(),
    };
    this.logSecurityEvent('lock_and_fingerprint', 'Digital fingerprint generated and version locked', {
      hash: hash.slice(0, 16) + '...' + hash.slice(-8),
    });

    return hash;
  }

  /**
   * Create version-controlled copy
   */
  createVersion(description: string, parentVersion?: string): string {
    const versionId = `v-${this.state.deedId}-${this.state.versionControl!.length + 1}`;
    
    const version: DeedVersionControl = {
      id: versionId,
      versionNumber: this.state.versionControl!.length + 1,
      parentVersionId: parentVersion,
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString(),
      description,
    };

    this.state.versionControl!.push(version);
    return versionId;
  }

  /**
   * Apply letter template
   */
  applyLetterTemplate(): void {
    if (this.state.currentPhase !== 'letter_template_preparation') {
      throw new Error(`Cannot apply template: Current phase is ${this.state.currentPhase}`);
    }
    if (!this.state.isLocked) {
      throw new Error('Version must be locked before applying letter template');
    }

    // Create pre-letter version if not exists
    if (!this.state.preLetterVersionId) {
      this.state.preLetterVersionId = this.createVersion('Pre-letter version');
    }

    this.state.letterTemplateApplied = true;
    this.logSecurityEvent('letter_template_preparation', 'Letter template applied', {});
  }

  /**
   * Insert security strip
   */
  insertSecurityStrip(stripData: any): void {
    if (this.state.currentPhase !== 'security_strip_insertion') {
      throw new Error(`Cannot insert strip: Current phase is ${this.state.currentPhase}`);
    }
    if (!this.state.letterTemplateApplied) {
      throw new Error('Letter template must be applied before inserting security strip');
    }

    this.state.securityStripData = stripData;
    this.state.internalTimestamps = {
      ...this.state.internalTimestamps,
      stripInsertionTime: new Date().toISOString(),
    };
    this.logSecurityEvent('security_strip_insertion', 'Bottom security strip inserted', {
      qrPresent: !!stripData.qrCode,
    });
  }

  /**
   * Generate QR code
   */
  generateQRCode(qrDataUrl: string): void {
    if (this.state.currentPhase !== 'qr_generation') {
      throw new Error(`Cannot generate QR: Current phase is ${this.state.currentPhase}`);
    }
    if (!this.state.securityStripData) {
      throw new Error('Security strip must be inserted before generating QR');
    }

    this.state.qrCodeUrl = qrDataUrl;
    this.logSecurityEvent('qr_generation', 'QR code generated and embedded', {});
  }

  /**
   * Archive deed with version control
   */
  archiveDeed(): void {
    if (this.state.currentPhase !== 'secure_archiving') {
      throw new Error(`Cannot archive: Current phase is ${this.state.currentPhase}`);
    }

    // Create post-letter version
    this.state.postLetterVersionId = this.createVersion(
      'Post-letter version',
      this.state.preLetterVersionId
    );

    this.state.isArchived = true;
    this.logSecurityEvent('secure_archiving', 'Deed securely archived with version control', {
      preLetterVersion: this.state.preLetterVersionId,
      postLetterVersion: this.state.postLetterVersionId,
    });
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    phase: WorkflowPhase,
    action: string,
    details: Record<string, any>
  ): void {
    const logEntry: WorkflowSecurityLog = {
      phase,
      timestamp: new Date().toISOString(),
      action,
      userId: 'system', // Should come from auth context
      details,
    };
    this.state.securityLog!.push(logEntry);
  }

  /**
   * Get full security audit log
   */
  getSecurityLog(): WorkflowSecurityLog[] {
    return [...(this.state.securityLog || [])];
  }

  /**
   * Validate current phase is complete before moving forward
   */
  validatePhaseCompletion(targetPhase: WorkflowPhase): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (this.state.currentPhase) {
      case 'first_notary_signature':
        if (!this.state.firstNotarySignature) {
          errors.push('First notary signature is required');
        }
        break;
      
      case 'second_notary_signature':
        if (!this.state.secondNotarySignature) {
          errors.push('Second notary signature is required');
        }
        break;
      
      case 'lock_and_fingerprint':
        if (!this.state.digitalHash) {
          errors.push('Digital fingerprint must be generated');
        }
        if (!this.state.isLocked) {
          errors.push('Version must be locked');
        }
        break;
      
      case 'letter_template_preparation':
        if (!this.state.letterTemplateApplied) {
          errors.push('Letter template must be applied');
        }
        break;
      
      case 'security_strip_insertion':
        if (!this.state.securityStripData) {
          errors.push('Security strip must be inserted');
        }
        break;
      
      case 'qr_generation':
        if (!this.state.qrCodeUrl) {
          errors.push('QR code must be generated');
        }
        break;
      
      case 'secure_archiving':
        if (!this.state.isArchived) {
          errors.push('Deed must be archived');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get workflow progress percentage
   */
  getProgress(): number {
    const currentIndex = this.phaseSequence.indexOf(this.state.currentPhase);
    return Math.round((currentIndex / this.phaseSequence.length) * 100);
  }

  /**
   * Get remaining phases
   */
  getRemainingPhases(): WorkflowPhase[] {
    const currentIndex = this.phaseSequence.indexOf(this.state.currentPhase);
    return this.phaseSequence.slice(currentIndex + 1);
  }
}

export default WorkflowStateManager;
