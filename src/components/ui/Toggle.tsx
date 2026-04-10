interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-vgreen' : 'bg-overlay'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
