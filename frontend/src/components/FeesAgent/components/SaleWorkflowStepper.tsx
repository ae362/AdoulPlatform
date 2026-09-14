import React from 'react';
import { DocumentWorkflowStepper } from './DocumentWorkflowStepper';

export interface SaleWorkflowStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  documentType?: string;
}

export const SaleWorkflowStepper: React.FC<SaleWorkflowStepperProps> = ({
  currentStep,
  onStepClick,
  documentType = 'بيع_وشراء'
}) => {
  return (
    <DocumentWorkflowStepper
      documentType={documentType}
      currentStep={currentStep}
      onStepClick={onStepClick}
    />
  );
};
