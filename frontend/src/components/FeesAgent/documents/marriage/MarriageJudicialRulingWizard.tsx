import React from 'react';
import type { DocumentWizardProps } from '../../types';
import { MarriageJudicialRulingWorkflow } from './MarriageJudicialRulingWorkflow';

export const MarriageJudicialRulingWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack,
}) => {
  return (
    <MarriageJudicialRulingWorkflow
      state={state}
      setState={setState}
      onComplete={() => setState(prev => ({ ...prev, step: 7 }))}
      onBack={onBack}
    />
  );
};

export default MarriageJudicialRulingWizard;
