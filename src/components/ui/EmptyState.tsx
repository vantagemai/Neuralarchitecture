import React from 'react';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  message: string;
  subtext?: string;
}

export function EmptyState({ icon, message, subtext }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="text-2xl mb-2">{typeof icon === 'string' ? icon : icon}</div>}
      <p className="text-sm text-t3">{message}</p>
      {subtext && <p className="text-xs text-t4 mt-1" dangerouslySetInnerHTML={{ __html: subtext }} />}
    </div>
  );
}
