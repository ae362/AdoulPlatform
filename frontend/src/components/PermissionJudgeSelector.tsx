import React from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  judgeName: string;
  selectedJudgeUserId?: string;
  onChange: (next: { judgeName: string; selectedJudgeUserId?: string }) => void;
  label?: string;
  helperText?: string;
};

export const PermissionJudgeSelector: React.FC<Props> = ({
  judgeName,
  selectedJudgeUserId,
  onChange,
  label = 'القاضي الموجه إليه الطلب',
  helperText = 'اختر القاضي من اللائحة أو أدخل الاسم يدوياً عند الحاجة.',
}) => {
  const { sessionToken } = useAuth();
  const { data: judges = [] } = trpc.messaging.listJudges.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      <div className="space-y-3">
        <select
          value={selectedJudgeUserId || ''}
          onChange={(e) => {
            const nextId = e.target.value;
            const selectedJudge = judges.find((judge) => judge.id === nextId);
            onChange({
              selectedJudgeUserId: nextId || undefined,
              judgeName: selectedJudge?.fullName || '',
            });
          }}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-red-950 outline-none font-bold"
        >
          <option value="">اختيار من قائمة القضاة</option>
          {judges.map((judge) => (
            <option key={judge.id} value={judge.id}>
              {judge.fullName}
            </option>
          ))}
        </select>

        {!selectedJudgeUserId && (
          <input
            type="text"
            value={judgeName}
            onChange={(e) =>
              onChange({
                judgeName: e.target.value,
                selectedJudgeUserId,
              })
            }
            placeholder="أو أدخل اسم القاضي يدوياً في حال عدم وجوده في القائمة"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-950 outline-none placeholder:text-slate-400"
          />
        )}
      </div>

      <p className="text-xs font-bold text-slate-400">{helperText}</p>
    </div>
  );
};

export default PermissionJudgeSelector;
