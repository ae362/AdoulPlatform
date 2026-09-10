import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractSchema, type Contract } from '../../../shared/schemas';
import { trpc } from '../trpc';

export function ContractsModule() {
  const utils = trpc.useUtils();
  const { data } = trpc.contracts.list.useQuery();
  const create = trpc.contracts.create.useMutation({ onSuccess: () => utils.contracts.list.invalidate() });
  const update = trpc.contracts.update.useMutation({ onSuccess: () => utils.contracts.list.invalidate() });
  const remove = trpc.contracts.delete.useMutation({ onSuccess: () => utils.contracts.list.invalidate() });
  const aiDraft = trpc.contracts.generateDraft.useMutation();
  const legalReview = trpc.contracts.legalReview.useMutation();
  const { register, handleSubmit, reset, setValue, watch } = useForm<Contract>({
    resolver: zodResolver(contractSchema),
  });
  const [review, setReview] = useState<string>('');

  const onSubmit = handleSubmit((values) => {
    if (values.id) update.mutate(values);
    else create.mutate(values, { onSuccess: () => reset() });
  });

  const runAIDraft = async () => {
    const response = await aiDraft.mutateAsync({
      contractType: watch('contract_type') || 'عقد',
      parties: watch('title') || '',
    });
    setValue('body', response.text);
  };

  const runLegal = async () => {
    const result = await legalReview.mutateAsync({
      recordType: watch('contract_type') || 'contract',
      payload: watch(),
    });
    setReview(JSON.stringify(result.issues, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-2xl font-black text-slate-900 font-maghribi">تحرير العقود و الرسوم</h3>
        <form className="mt-3 space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="input" placeholder="نوع العقد / الرسم" {...register('contract_type')} />
            <input className="input md:col-span-2" placeholder="عنوان العقد" {...register('title')} />
          </div>
          <textarea className="input h-40" placeholder="نص العقد" {...register('body')} />
          <textarea className="input" placeholder="ملاحظات الذكاء الاصطناعي" {...register('ai_notes')} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={runAIDraft} disabled={aiDraft.isPending}>
              توليد عقد بالذكاء الاصطناعي
            </button>
            <button className="btn-secondary" type="button" onClick={runLegal} disabled={legalReview.isPending}>
              فحص قانونية العقد
            </button>
            <button className="btn-secondary" type="button" onClick={() => reset()}>
              جديد
            </button>
            <button className="btn-primary" type="submit">
              حفظ
            </button>
          </div>
        </form>
        {review && (
          <pre className="mt-3 rounded bg-slate-100 p-3 text-xs text-left ltr">
            {review}
          </pre>
        )}
      </div>
      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-2 text-base font-semibold">العقود المحررة</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm rtl:text-right">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">نوع العقد</th>
                <th className="p-2">العنوان</th>
                <th className="p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.contract_type}</td>
                  <td className="p-2">{row.title}</td>
                  <td className="p-2 flex gap-2">
                    <button className="btn-secondary" onClick={() => reset(row)}>
                      تعديل
                    </button>
                    <button className="btn-danger" onClick={() => remove.mutate({ id: row.id! })}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

