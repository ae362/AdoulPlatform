import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../trpc';

export function DateWidget() {
  const { data } = trpc.date.getCurrent.useQuery();

  if (!data) return <span className="text-xs text-slate-400">...</span>;

  return (
    <div className="flex flex-col text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <span>م:</span>
        <span>{new Date(data.gregorian).toLocaleDateString('en-CA')}</span>
      </span>
      <span className="flex items-center gap-1">
        <span>ه:</span>
        <span>{data.hijri}</span>
      </span>
    </div>
  );
}
