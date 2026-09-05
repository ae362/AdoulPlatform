import React from 'react';
import type { DocumentWizardProps } from '../../types';
import {
  Step1_Divorce_JudicialDetails,
  Step2_Divorce_Spouses,
  Step3_Divorce_MarriageDetails,
  Step4_Divorce_Summary
} from '../../../../modules/DivorceSteps';
import { Step6_Dates } from '../../steps/Step6_Dates';

export const DivorceWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Divorce_JudicialDetails state={state} setState={setState} />}
      {state.step === 2 && <Step2_Divorce_Spouses state={state} setState={setState} />}
      {state.step === 3 && <Step3_Divorce_MarriageDetails state={state} setState={setState} />}
      {state.step === 4 && <Step4_Divorce_Summary state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
