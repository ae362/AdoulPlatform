import React from 'react';
import GenericPermissionPortal from '../Notary/GenericPermissionPortal';
import ScientificPermissionForm from '../Notary/ScientificPermissionForm';
import { ScientificDocumentView } from '../../components/ScientificDocumentView';
import { trpc } from '../../trpc';

const ScientificPermissionPortal: React.FC = () => {
    // Basic approval template for scientific
    const ApprovalTemplate = ({ notification }: any) => (
      <div className="p-12 border-4 border-double border-slate-900 text-right space-y-6 font-amiri">
        <h1 className="text-3xl font-black text-center underline mb-8">إذن قضائي بتلقي شهادة</h1>
        <p className="text-xl">بناء على الطلب رقم {notification.request_number} المقدم من طرف العدل {notification.notary_name}</p>
        <p className="text-xl">يأذن القاضي المكلف بالتوثيق بتلقي الشهادة موضوع الطلب.</p>
        <div className="pt-10 flex justify-end">
          <div className="text-center">
             <p>توقيع القاضي</p>
             <div className="h-16"></div>
          </div>
        </div>
      </div>
    );

    return (
        <GenericPermissionPortal 
            title="طلب إذن بتلقي شهادة علمية/مثلية"
            icon="🎓"
            type="scientific"
            formComponent={ScientificPermissionForm}
            documentViewComponent={ScientificDocumentView}
            approvalTemplateComponent={ApprovalTemplate}
            createMutation={trpc.permissions.createScientific.useMutation()}
        />
    );
};

export default ScientificPermissionPortal;
