import React from 'react';
import type { FeesAgentState } from '../../types/feesAgentTypes';

export interface DocumentWizardProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onNext?: () => void;
  onBack?: () => void;
}

