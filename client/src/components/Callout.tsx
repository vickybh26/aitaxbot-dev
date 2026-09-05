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
    bgColor: 'bg-secondary'
  },
  warning: {
    borderColor: 'border-amber-500',
    label: '⚠ Warning',
    bgColor: 'bg-secondary'
  },
  tip: {
    borderColor: 'border-green-500',
    label: 'Tip',
    bgColor: 'bg-secondary'
  },
  important: {
    borderColor: 'border-red-500',
    label: 'Important',
    bgColor: 'bg-secondary'
  }
};

export default function Callout({ type, children }: CalloutProps) {
  const config = calloutConfig[type];

  return (
    <div className={`border-l-4 ${config.borderColor} ${config.bgColor} p-4 rounded-r-lg`}>
      <div className="text-xs font-semibold text-ink/65 mb-2">
        {config.label}
      </div>
      <div className="text-sm text-ink/80">
        {children}
      </div>
    </div>
  );
}
