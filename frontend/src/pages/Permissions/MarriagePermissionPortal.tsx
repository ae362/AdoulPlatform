import React from 'react';
import GenericPermissionPortal from '../Notary/GenericPermissionPortal';
import MarriagePermissionForm from '../Notary/MarriagePermissionForm';
import { MarriageDocumentView } from '../../components/MarriageDocumentView';
import { MarriagePermissionApprovalTemplate } from '../../components/MarriagePermissionApprovalTemplate';
import { trpc } from '../../trpc';

const MarriagePermissionPortal: React.FC = () => {
    return (
        <GenericPermissionPortal 
            title="طلب الاذن بالزواج عبر بوابة العدل"
            icon="💍"
            type="marriage"
            formComponent={MarriagePermissionForm}
            documentViewComponent={MarriageDocumentView}
            approvalTemplateComponent={MarriagePermissionApprovalTemplate}
            createMutation={trpc.permissions.createMarriage.useMutation()}
        />
    );
};

export default MarriagePermissionPortal;
