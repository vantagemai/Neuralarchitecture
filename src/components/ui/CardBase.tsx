interface CardBaseProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function CardBase({ children, className = '', padding = 'md' }: CardBaseProps) {
  const pad = { none: '', sm: 'p-3', md: 'p-4', lg: 'px-5 py-4' }[padding];
  return (
    <div className={`bg-surface border border-b1 rounded-lg ${pad} ${className}`}>
      {children}
    </div>
  );
}
