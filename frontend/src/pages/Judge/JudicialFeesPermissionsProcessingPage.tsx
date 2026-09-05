import React from 'react';
import GenericPermissionProcessor from './GenericPermissionProcessor';
import { AdlCopyDocumentView } from '../../components/AdlCopyDocumentView';
import { AdlCopyPermissionApprovalTemplate } from '../../components/AdlCopyPermissionApprovalTemplate';
import { trpc } from '../../trpc';

const JudicialFeesPermissionsProcessingPage: React.FC = () => {
    return (
        <GenericPermissionProcessor 
            title="معالجة طلبات استخراج النسخ/النظائر"
            icon="📜"
            type="judicialFees"
            documentViewComponent={AdlCopyDocumentView}
            approvalTemplateComponent={AdlCopyPermissionApprovalTemplate}
            queryHook={(trpc as any).permissions.getAllJudicialFees.useQuery}
        />
    );
};

export default JudicialFeesPermissionsProcessingPage;
