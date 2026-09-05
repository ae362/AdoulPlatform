import React from 'react';
import GenericPermissionProcessor from './GenericPermissionProcessor';
import { IndividualReceptionRequestTemplate } from '../../components/IndividualReceptionRequestTemplate';
import { IndividualReceptionDocumentTemplate } from '../../components/IndividualReceptionDocumentTemplate';
import { trpc } from '../../trpc';

const IndividualReceptionPermissionsProcessingPage: React.FC = () => {
    return (
        <GenericPermissionProcessor 
            title="معالجة طلبات التلقي الفردي"
            icon="👤"
            type="individualReception"
            documentViewComponent={IndividualReceptionRequestTemplate}
            approvalTemplateComponent={IndividualReceptionDocumentTemplate as any}
            queryHook={(trpc as any).permissions.getAllIndividualReception.useQuery}
        />
    );
};

export default IndividualReceptionPermissionsProcessingPage;
