import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationStampSchema, type RegistrationStamp } from '../../../shared/schemas';
import { trpc } from '../trpc';

export function RegistrationStampModule() {
  const utils = trpc.useUtils();
  const { data } = trpc.registrationStamps.list.useQuery();
  const create = trpc.registrationStamps.create.useMutation({
    onSuccess: () => utils.registrationStamps.list.invalidate(),
  });
  const update = trpc.registrationStamps.update.useMutation({
    onSuccess: () => utils.registrationStamps.list.invalidate(),
  });
  const remove = trpc.registrationStamps.delete.useMutation({
    onSuccess: () => utils.registrationStamps.list.invalidate(),
  });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, { refetchOnWindowFocus: false });

  const { register, handleSubmit, reset, setValue, watch } = useForm<RegistrationStamp>({
    resolver: zodResolver(registrationStampSchema),
  });

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    const paidDate = watch('paid_date');
    if (!id && !paidDate) {
      setValue('paid_date', now.gregorian.slice(0, 10));
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    if (values.id) update.mutate(values);
    else create.mutate(values, { onSuccess: () => reset() });
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">Registration & Stamp</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input className="input" placeholder="Record type (marriage / fee / contract)" {...register('record_type')} />
          <input className="input" placeholder="Record ID" {...register('record_id')} />
          <input className="input" placeholder="Registration number" {...register('registration_number')} />
          <input
            className="input"
            placeholder="Tax / stamp amount"
            type="number"
            step="0.01"
            {...register('tax_value', { valueAsNumber: true })}
          />
          <input className="input" type="date" placeholder="Paid date" {...register('paid_date')} />
          <input className="input" placeholder="Office" {...register('office')} />
          <input className="input" placeholder="Receipt reference" {...register('receipt_ref')} />
          <div className="md:col-span-3 flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => reset()}>
              Reset
            </button>
            <button className="btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-2 text-base font-semibold">Registered items</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Record type</th>
                <th className="p-2">Record ID</th>
                <th className="p-2">Office</th>
                <th className="p-2">Paid date</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.record_type}</td>
                  <td className="p-2">{row.record_id}</td>
                  <td className="p-2">{row.office}</td>
                  <td className="p-2">{row.paid_date}</td>
                  <td className="p-2 flex gap-2">
                    <button className="btn-secondary" type="button" onClick={() => reset(row as any)}>
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => row.id && remove.mutate({ id: row.id })}
                    >
                      Delete
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

