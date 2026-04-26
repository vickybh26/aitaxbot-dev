import React from 'react';

type CalloutType = 'info' | 'warning' | 'tip' | 'important';

interface CalloutProps {
  type: CalloutType;
  children: React.ReactNode;
}

const calloutConfig: Record<CalloutType, { borderColor: string; label: string; bgColor: string }> = {
  info: {
    borderColor: 'border-blue-400',
    label: 'Note',
    bgColor: 'bg-slate-50'
  },
  warning: {
    borderColor: 'border-amber-500',
    label: '⚠ Warning',
    bgColor: 'bg-slate-50'
  },
  tip: {
    borderColor: 'border-green-500',
    label: 'Tip',
    bgColor: 'bg-slate-50'
  },
  important: {
    borderColor: 'border-red-500',
    label: 'Important',
    bgColor: 'bg-slate-50'
  }
};

export default function Callout({ type, children }: CalloutProps) {
  const config = calloutConfig[type];

  return (
    <div className={`border-l-4 ${config.borderColor} ${config.bgColor} p-4 rounded-r-lg`}>
      <div className="text-xs font-semibold text-slate-600 mb-2">
        {config.label}
      </div>
      <div className="text-sm text-slate-700">
        {children}
      </div>
    </div>
  );
}
