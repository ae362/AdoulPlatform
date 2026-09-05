import React from 'react';
import GenericPermissionPortal from '../Notary/GenericPermissionPortal';
import { IndividualReceptionPermissionForm } from '../Notary/IndividualReceptionPermissionForm';
import { IndividualReceptionRequestTemplate } from '../../components/IndividualReceptionRequestTemplate';
import { IndividualReceptionDocumentTemplate } from '../../components/IndividualReceptionDocumentTemplate';
import { trpc } from '../../trpc';

const IndividualReceptionPermissionPortal: React.FC = () => {
    return (
        <GenericPermissionPortal 
            title="طلب الإذن بالتلقي الفردي / غير المتزامن"
            icon="👤"
            type="individualReception"
            formComponent={IndividualReceptionPermissionForm}
            documentViewComponent={IndividualReceptionRequestTemplate}
            approvalTemplateComponent={IndividualReceptionDocumentTemplate}
            createMutation={trpc.permissions.createIndividualReception.useMutation()}
        />
    );
};

export default IndividualReceptionPermissionPortal;
