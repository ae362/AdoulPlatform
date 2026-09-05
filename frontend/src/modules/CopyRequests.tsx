import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { copyRequestSchema, type CopyRequest } from '../../../shared/schemas';
import { trpc } from '../trpc';

export function CopyRequestsModule() {
  const utils = trpc.useUtils();
  const [listFilter, setListFilter] = useState<{
    cin?: string;
    record_type?: string;
    name?: string;
    from?: string;
    to?: string;
  }>();
  const { data } = trpc.copyRequests.list.useQuery(listFilter);
  const create = trpc.copyRequests.create.useMutation({ onSuccess: () => utils.copyRequests.list.invalidate() });
  const update = trpc.copyRequests.update.useMutation({ onSuccess: () => utils.copyRequests.list.invalidate() });
  const remove = trpc.copyRequests.delete.useMutation({ onSuccess: () => utils.copyRequests.list.invalidate() });
  const { data: now } = trpc.date.getCurrent.useQuery(undefined, { refetchOnWindowFocus: false });

  const { register, handleSubmit, reset, setValue, watch } = useForm<CopyRequest>({
    resolver: zodResolver(copyRequestSchema),
  });

  const [searchCin, setSearchCin] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const ocr = trpc.ocr.parseText.useMutation();
  const semantic = trpc.ai.semanticSearch.useMutation();
  const [ocrPreview, setOcrPreview] = useState('');
  const [semanticResults, setSemanticResults] = useState<{ id: string; score: number; snippet: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!now) return;
    const id = watch('id');
    const currentDate = watch('request_date');
    if (!id && !currentDate) {
      setValue('request_date', now.gregorian.slice(0, 10));
    }
  }, [now, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    if (values.id) update.mutate(values);
    else create.mutate(values, { onSuccess: () => reset() });
  });

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setListFilter({
      cin: searchCin || undefined,
      record_type: searchType || undefined,
      name: searchName || undefined,
      from: searchFrom || undefined,
      to: searchTo || undefined,
    });
  };

  const clearFilter = () => {
    setSearchCin('');
    setSearchType('');
    setSearchName('');
    setSearchFrom('');
    setSearchTo('');
    setListFilter(undefined);
  };

  const triggerImageSearch = () => {
    fileInputRef.current?.click();
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await toBase64(file);
      const ocrResult = await ocr.mutateAsync({ base64 });
      setOcrPreview(ocrResult.rawText);
      const sem = await semantic.mutateAsync({ query: ocrResult.rawText });
      setSemanticResults(sem);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">Copy requests</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input className="input" placeholder="Record type (marriage / divorce / fee…)" {...register('record_type')} />
          <input className="input" placeholder="Requester full name" {...register('requester_name')} />
          <input className="input" placeholder="Requester CIN" {...register('requester_cin')} />
          <input className="input" type="date" placeholder="Request date" {...register('request_date')} />
          <select className="input" {...register('status')}>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
          <textarea className="input md:col-span-3" placeholder="Notes" {...register('notes')} />
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
        <h4 className="mb-2 text-base font-semibold">Search copy requests</h4>
        <form onSubmit={applyFilter} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="input"
            placeholder="CIN"
            value={searchCin}
            onChange={(e) => setSearchCin(e.target.value)}
          />
          <input
            className="input"
            placeholder="Requester name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Record type"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={searchFrom}
            onChange={(e) => setSearchFrom(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={searchTo}
            onChange={(e) => setSearchTo(e.target.value)}
          />
          <div className="md:col-span-5 flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={clearFilter}>
              Clear
            </button>
            <button className="btn-primary" type="submit">
              Search
            </button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Record type</th>
                <th className="p-2">Requester</th>
                <th className="p-2">CIN</th>
                <th className="p-2">Request date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.record_type}</td>
                  <td className="p-2">{row.requester_name}</td>
                  <td className="p-2">{row.requester_cin}</td>
                  <td className="p-2">{row.request_date}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2 flex gap-2">
                    <button className="btn-secondary" type="button" onClick={() => reset(row)}>
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

      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-2 text-base font-semibold">Search by scanned image (OCR + AI)</h4>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-secondary" type="button" onClick={triggerImageSearch} disabled={ocr.isLoading}>
            Upload image for OCR
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onFileSelected} />
          {ocrPreview && <span className="text-xs text-slate-500 ltr">{ocrPreview.slice(0, 120)}...</span>}
        </div>
        {semanticResults.length > 0 && (
          <div className="mt-3 space-y-2 text-xs">
            {semanticResults.map((r) => (
              <div key={r.id} className="rounded border bg-slate-50 p-2">
                <div className="flex items-center justify-between">
                  <span>ID: {r.id}</span>
                  <span className="text-slate-500">Score: {r.score.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-slate-600">{r.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

