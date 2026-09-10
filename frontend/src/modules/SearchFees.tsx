import React, { useState } from 'react';
import { trpc } from '../trpc';

export function SearchFeesModule() {
  const [identityParams, setIdentityParams] = useState({
    recordType: 'all',
    cin: '',
    name: '',
    from: '',
    to: '',
  });
  const [identityEnabled, setIdentityEnabled] = useState(false);
  const identityQuery = trpc.search.byIdentity.useQuery(
    {
      recordType: (identityParams.recordType as any) || undefined,
      cin: identityParams.cin || undefined,
      name: identityParams.name || undefined,
      from: identityParams.from || undefined,
      to: identityParams.to || undefined,
    },
    { enabled: identityEnabled, placeholderData: (prev) => prev },
  );

  const [registryParams, setRegistryParams] = useState({
    bookType: '',
    number: '',
    count: '',
    page: '',
  });
  const [registryEnabled, setRegistryEnabled] = useState(false);
  const registryQuery = trpc.search.byRegistry.useQuery(
    {
      bookType: registryParams.bookType || undefined,
      registryNumber: registryParams.number ? Number(registryParams.number) : undefined,
      registryCount: registryParams.count ? Number(registryParams.count) : undefined,
      registryPage: registryParams.page ? Number(registryParams.page) : undefined,
    },
    { enabled: registryEnabled, placeholderData: (prev) => prev },
  );

  const [docRef, setDocRef] = useState('');
  const [docEnabled, setDocEnabled] = useState(false);
  const docQuery = trpc.search.byDocumentRef.useQuery(
    { ref: docRef },
    { enabled: docEnabled, placeholderData: (prev) => prev },
  );

  const [coords, setCoords] = useState('');
  const [coordsEnabled, setCoordsEnabled] = useState(false);
  const coordsQuery = trpc.search.byCoordinates.useQuery(
    { text: coords },
    { enabled: coordsEnabled, placeholderData: (prev) => prev },
  );

  const submitIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setIdentityEnabled(true);
    identityQuery.refetch();
  };

  const submitRegistry = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistryEnabled(true);
    registryQuery.refetch();
  };

  const submitDoc = (e: React.FormEvent) => {
    e.preventDefault();
    setDocEnabled(true);
    docQuery.refetch();
  };

  const submitCoords = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordsEnabled(true);
    coordsQuery.refetch();
  };

  const typeLabel = (source: string, feeType?: string | null) => {
    switch (source) {
      case 'marriage':
        return 'زواج';
      case 'divorce':
        return 'طلاق';
      case 'property':
        return feeType ? `رسوم الأملاك (${feeType})` : 'رسوم الأملاك';
      case 'inheritance':
        return feeType ? `رسوم التركات (${feeType})` : 'رسوم التركات';
      case 'other':
        return feeType ? `رسوم باقي الوثائق (${feeType})` : 'رسوم باقي الوثائق';
      default:
        return '—';
    }
  };

  const partiesLabel = (row: any) => {
    switch (row.source) {
      case 'marriage':
      case 'divorce': {
        const parties = [row.husband_name, row.wife_name].filter(Boolean).join(' / ');
        return parties || '—';
      }
      case 'property':
        return row.parties_names || '—';
      case 'inheritance': {
        const parts = [row.heirs_names, row.deceased_name ? `المتوفى: ${row.deceased_name}` : null].filter(Boolean);
        return parts.length ? parts.join(' – ') : '—';
      }
      case 'other':
        return row.applicants_names || '—';
      default:
        return '—';
    }
  };

  const cinLabel = (row: any) => {
    switch (row.source) {
      case 'marriage':
      case 'divorce': {
        const cins = [row.husband_cin, row.wife_cin].filter(Boolean).join(' / ');
        return cins || '—';
      }
      case 'property':
        return row.parties_cin || '—';
      case 'inheritance':
        return row.applicants_cin || '—';
      case 'other':
        return row.applicants_cin || '—';
      default:
        return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-base font-semibold">البحث حسب الهوية</h3>
        <form onSubmit={submitIdentity} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            className="input"
            value={identityParams.recordType}
            onChange={(e) => setIdentityParams((p) => ({ ...p, recordType: e.target.value }))}
          >
            <option value="all">جميع الرسوم</option>
            <option value="marriage">زواج</option>
            <option value="divorce">طلاق</option>
            <option value="property">رسوم الأملاك</option>
            <option value="inheritance">رسوم التركات</option>
            <option value="other">رسوم باقي الوثائق</option>
          </select>
          <input
            className="input"
            placeholder="رقم البطاقة الوطنية"
            value={identityParams.cin}
            onChange={(e) => setIdentityParams((p) => ({ ...p, cin: e.target.value }))}
          />
          <input
            className="input"
            placeholder="الاسم الكامل"
            value={identityParams.name}
            onChange={(e) => setIdentityParams((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="input"
            type="date"
            value={identityParams.from}
            onChange={(e) => setIdentityParams((p) => ({ ...p, from: e.target.value }))}
          />
          <input
            className="input"
            type="date"
            value={identityParams.to}
            onChange={(e) => setIdentityParams((p) => ({ ...p, to: e.target.value }))}
          />
          <div className="md:col-span-5 mt-2 flex justify-end">
            <button className="btn-primary" type="submit">
              بحث
            </button>
          </div>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">النوع</th>
                <th className="p-2">الأطراف</th>
                <th className="p-2">CIN</th>
                <th className="p-2">تاريخ التضمين</th>
              </tr>
            </thead>
            <tbody>
              {identityQuery.data?.map((row) => (
                <tr key={row.source + row.id} className="border-b">
                  <td className="p-2">{typeLabel(row.source, row.fee_type)}</td>
                  <td className="p-2">{partiesLabel(row)}</td>
                  <td className="p-2">{cinLabel(row)}</td>
                  <td className="p-2">{row.inclusion_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-base font-semibold">البحث حسب مرجع سجل التضمين</h3>
        <form onSubmit={submitRegistry} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="نوع الكناش"
            value={registryParams.bookType}
            onChange={(e) => setRegistryParams((p) => ({ ...p, bookType: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="الرقم"
            value={registryParams.number}
            onChange={(e) => setRegistryParams((p) => ({ ...p, number: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="العدد"
            value={registryParams.count}
            onChange={(e) => setRegistryParams((p) => ({ ...p, count: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="الصحيفة"
            value={registryParams.page}
            onChange={(e) => setRegistryParams((p) => ({ ...p, page: e.target.value }))}
          />
          <div className="md:col-span-4 mt-2 flex justify-end">
            <button className="btn-primary" type="submit">
              بحث
            </button>
          </div>
        </form>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-sm font-semibold">الزواج / الطلاق</h4>
            <ul className="space-y-1 text-xs">
              {registryQuery.data?.marriage?.map((m) => (
                <li key={`m-${m.id}`}>زواج: {m.husband_name} / {m.wife_name}</li>
              ))}
              {registryQuery.data?.divorce?.map((d) => (
                <li key={`d-${d.id}`}>طلاق: {d.husband_name} / {d.wife_name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold">رسوم الأملاك والتركات وباقي الوثائق</h4>
            <ul className="space-y-1 text-xs">
              {registryQuery.data?.property?.map((p) => (
                <li key={`p-${p.id}`}>أملاك: {p.parties_names}</li>
              ))}
              {registryQuery.data?.inheritance?.map((i) => (
                <li key={`i-${i.id}`}>تركات: {i.deceased_name}</li>
              ))}
              {registryQuery.data?.other?.map((o) => (
                <li key={`o-${o.id}`}>وثيقة: {o.fee_type}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-base font-semibold">البحث حسب مرجع سند الرسم</h3>
        <form onSubmit={submitDoc} className="flex flex-col gap-3 md:flex-row">
          <input
            className="input flex-1"
            placeholder="مرجع الحكم / الشهادة / الرسم العقاري..."
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
          />
          <button className="btn-primary md:w-40" type="submit">
            بحث
          </button>
        </form>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-sm font-semibold">الرسوم</h4>
            <ul className="space-y-1 text-xs">
              {docQuery.data?.marriage?.map((m) => (
                <li key={`dm-${m.id}`}>زواج: {m.source_document_ref}</li>
              ))}
              {docQuery.data?.property?.map((p) => (
                <li key={`dp-${p.id}`}>أملاك: {p.source_document_ref}</li>
              ))}
              {docQuery.data?.inheritance?.map((i) => (
                <li key={`di-${i.id}`}>تركات: {i.document_references}</li>
              ))}
              {docQuery.data?.other?.map((o) => (
                <li key={`do-${o.id}`}>وثيقة: {o.document_refs}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold">العقود</h4>
            <ul className="space-y-1 text-xs">
              {docQuery.data?.contracts?.map((c) => (
                <li key={`dc-${c.id}`}>{c.title}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-base font-semibold">البحث حسب إحداثيات العقار</h3>
        <form onSubmit={submitCoords} className="flex flex-col gap-3 md:flex-row">
          <input
            className="input flex-1"
            placeholder="إلصق هنا الإحداثيات النصية..."
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
          />
          <button className="btn-primary md:w-40" type="submit">
            بحث
          </button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">نوع الرسم</th>
                <th className="p-2">الأطراف</th>
                <th className="p-2">الإحداثيات</th>
              </tr>
            </thead>
            <tbody>
              {coordsQuery.data?.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.fee_type}</td>
                  <td className="p-2">{row.parties_names}</td>
                  <td className="p-2">{row.property_coordinates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
