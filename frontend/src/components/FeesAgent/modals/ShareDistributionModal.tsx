import React, { useState } from 'react';
import type { Party } from '../../../types/feesAgentTypes';

export interface ShareDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  onUpdateShares: (shares: { index: number; value: string }[]) => void;
  title?: string;
}

export const ShareDistributionModal: React.FC<ShareDistributionModalProps> = ({
  isOpen,
  onClose,
  parties,
  onUpdateShares,
  title = 'توزيع الحصص',
}) => {
  if (!isOpen) return null;

  const [shares, setShares] = useState(
    parties.map((p) => ({
      name: p.name || `طرف ${parties.indexOf(p) + 1}`,
      value: parseFloat(p.share?.replace('%', '') || '0') || 100 / parties.length,
    }))
  );

  const total = shares.reduce((sum, s) => sum + s.value, 0);

  // Calculate conic gradient for pie chart
  let currentAngle = 0;
  const gradientParts = shares.map((s, i) => {
    const start = currentAngle;
    const end = currentAngle + (s.value / 100) * 360;
    currentAngle = end;
    const color = `hsl(${(i * 360) / shares.length}, 70%, 60%)`;
    return `${color} ${start}deg ${end}deg`;
  });

  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  const handleShareChange = (index: number, newValue: number) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, newValue));

    const newShares = [...shares];

    // If there's only one party, it must be 100%
    if (newShares.length === 1) {
      newShares[index].value = 100;
      setShares(newShares);
      return;
    }

    // Update the changed share
    newShares[index].value = clampedValue;

    // Distribute the difference among others
    const remainingTotal = 100 - clampedValue;
    const otherIndices = newShares.map((_, i) => i).filter((i) => i !== index);
    const currentSumOthers = otherIndices.reduce((sum, i) => sum + newShares[i].value, 0);

    if (currentSumOthers > 0) {
      // Distribute proportionally
      otherIndices.forEach((i) => {
        const ratio = newShares[i].value / currentSumOthers;
        newShares[i].value = remainingTotal * ratio;
      });
    } else {
      // Distribute equally if others are 0
      const equalShare = remainingTotal / otherIndices.length;
      otherIndices.forEach((i) => {
        newShares[i].value = equalShare;
      });
    }

    // Fix precision issues to ensure sum is exactly 100
    newShares.forEach((s) => (s.value = parseFloat(s.value.toFixed(2))));

    // Force sum to 100 by adjusting the largest of the others to absorb rounding errors
    const currentTotal = newShares.reduce((sum, s) => sum + s.value, 0);
    if (Math.abs(currentTotal - 100) > 0.001) {
      if (otherIndices.length > 0) {
        let maxValIndex = otherIndices[0];
        let maxVal = newShares[maxValIndex].value;

        otherIndices.forEach((i) => {
          if (newShares[i].value > maxVal) {
            maxVal = newShares[i].value;
            maxValIndex = i;
          }
        });

        const diff = 100 - currentTotal;
        newShares[maxValIndex].value += diff;
        newShares[maxValIndex].value = parseFloat(newShares[maxValIndex].value.toFixed(2));
      }
    }

    setShares(newShares);
  };

  const handleSave = () => {
    onUpdateShares(shares.map((s, i) => ({ index: i, value: `${s.value.toFixed(2)}%` })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pie Chart Visualization */}
          <div className="flex flex-col items-center justify-center">
            <div
              className="w-48 h-48 rounded-full shadow-inner border-4 border-white"
              style={{ background: gradient }}
            />
            <div className="mt-4 text-center">
              <p
                className={`font-bold ${
                  Math.abs(total - 100) < 0.1 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                المجموع: {total.toFixed(1)}%
              </p>
              {Math.abs(total - 100) >= 0.1 && (
                <p className="text-xs text-red-500">يجب أن يكون المجموع 100%</p>
              )}
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {shares.map((share, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: `hsl(${(idx * 360) / shares.length}, 70%, 60%)` }}
                />
                <span className="text-sm font-medium flex-1 truncate">{share.name}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={share.value}
                  onChange={(e) => handleShareChange(idx, parseFloat(e.target.value) || 0)}
                  className="w-20 p-2 border rounded text-center"
                />
                <span className="text-gray-500">%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={Math.abs(total - 100) >= 0.1}
            className={`px-6 py-2 rounded-lg text-white font-semibold ${
              Math.abs(total - 100) < 0.1
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            حفظ التوزيع
          </button>
        </div>
      </div>
    </div>
  );
};
