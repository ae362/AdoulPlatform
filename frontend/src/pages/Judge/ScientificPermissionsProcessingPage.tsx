import React from 'react';
import GenericPermissionProcessor from './GenericPermissionProcessor';
import { ScientificDocumentView } from '../../components/ScientificDocumentView';
import { ScientificPermissionApprovalTemplate } from '../../components/ScientificPermissionApprovalTemplate';
import { trpc } from '../../trpc';

const ScientificPermissionsProcessingPage: React.FC = () => {
    return (
        <GenericPermissionProcessor 
            title="معالجة طلبات الإذن بالشهادة العلمية"
            icon="🎓"
            type="scientific"
            documentViewComponent={ScientificDocumentView}
            approvalTemplateComponent={ScientificPermissionApprovalTemplate}
            queryHook={(trpc as any).permissions.getAllScientific.useQuery}
        />
    );
};

export default ScientificPermissionsProcessingPage;
