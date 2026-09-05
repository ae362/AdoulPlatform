import React, { useState } from 'react';

export function FilesMiscModule() {
  const [notes, setNotes] = useState<string>('');
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">مكتبة الملفات (تخزين Supabase)</h3>
        <p className="mt-2 text-sm text-slate-600">
          يمكن ربط هذه الشاشة مع Supabase Storage لرفع المستندات (PDF/TIFF/JPEG) وربطها بالرسوم والعقود.
        </p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">مختلفات</h3>
        <textarea
          className="input h-40"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات عامة أو تهيئات"
        />
      </div>
    </div>
  );
}
