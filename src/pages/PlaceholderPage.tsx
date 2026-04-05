import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-elevated border border-b1 flex items-center justify-center mb-6">
        <Construction size={28} className="text-t4" />
      </div>
      <h2 className="text-xl font-bold text-t1 mb-2">{title}</h2>
      <p className="text-sm text-t3 max-w-md">
        {description || 'Esta página está sendo construída. Em breve estará disponível.'}
      </p>
    </div>
  );
}
