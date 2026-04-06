import { ChevronDown, Minus } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  onCollapse?: () => void;
  collapsed?: boolean;
  actions?: React.ReactNode;
}

export function PanelHeader({ title, onCollapse, collapsed, actions }: PanelHeaderProps) {
  return (
    <div
      className="h-7 bg-elevated border-b border-b1 px-2 flex items-center justify-between select-none shrink-0"
      onDoubleClick={onCollapse}
    >
      <span className="text-[10px] font-medium text-t3 uppercase tracking-wider truncate">{title}</span>
      <div className="flex items-center gap-1">
        {actions}
        {onCollapse && (
          <button onClick={onCollapse} className="w-4 h-4 flex items-center justify-center text-t3 hover:text-t1 transition-colors">
            {collapsed ? <ChevronDown size={10} /> : <Minus size={8} />}
          </button>
        )}
      </div>
    </div>
  );
}
