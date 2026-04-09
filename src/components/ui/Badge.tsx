interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'green' | 'gold' | 'purp' | 'blue' | 'pink' | 'dim';
}

const VARIANTS = {
  red:   'bg-vred/10 text-vred border-vred/20',
  green: 'bg-vgreen/10 text-vgreen border-vgreen/20',
  gold:  'bg-vgold/10 text-vgold border-vgold/20',
  purp:  'bg-vpurp/10 text-vpurp border-vpurp/20',
  blue:  'bg-vblue/10 text-vblue border-vblue/20',
  pink:  'bg-pink-500/10 text-pink-400 border-pink-500/20',
  dim:   'bg-elevated text-t3 border-b1',
};

export function Badge({ children, variant = 'dim' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider border ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
