import React from 'react';
import GenericPermissionPortal from '../Notary/GenericPermissionPortal';
import AdlCopyPermissionForm from '../Notary/AdlCopyPermissionForm';
import { AdlCopyDocumentView } from '../../components/AdlCopyDocumentView';
import { AdlCopyPermissionApprovalTemplate } from '../../components/AdlCopyPermissionApprovalTemplate';
import { trpc } from '../../trpc';

const JudicialFeesPermissionPortal: React.FC = () => {
    return (
        <GenericPermissionPortal 
            title="طلبات الإذن لاستخراج نسخ/نظائر الرسوم العدلية"
            icon="📜"
            type="judicialFees"
            formComponent={AdlCopyPermissionForm}
            documentViewComponent={AdlCopyDocumentView}
            approvalTemplateComponent={AdlCopyPermissionApprovalTemplate}
            createMutation={trpc.permissions.createJudicialFees.useMutation()}
        />
    );
};

export default JudicialFeesPermissionPortal;
