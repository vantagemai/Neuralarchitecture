interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
}

const SIZES = {
  sm: { icon: 24, text: 14, gap: 6 },
  md: { icon: 32, text: 18, gap: 8 },
  lg: { icon: 40, text: 24, gap: 10 },
  xl: { icon: 56, text: 32, gap: 14 },
};

function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left ear - red */}
      <polygon points="8,28 38,10 40,38" fill="#D4634B"/>
      {/* Right ear - red */}
      <polygon points="92,28 62,10 60,38" fill="#D4634B"/>
      {/* Head body - dark */}
      <polygon points="5,33 50,38 95,33 95,50 75,53 50,85 25,53 5,50" fill="currentColor"/>
      {/* V inner cut */}
      <polygon points="25,40 50,78 75,40 65,40 50,65 35,40" fill="currentColor" opacity="0.15"/>
    </svg>
  );
}

export function Logo({ size = 'md', iconOnly = false }: LogoProps) {
  const s = SIZES[size];

  if (iconOnly) {
    return <LogoIcon size={s.icon} />;
  }

  return (
    <div className="flex items-center" style={{ gap: s.gap }}>
      <LogoIcon size={s.icon} />
      <div className="flex flex-col" style={{ lineHeight: 1.1 }}>
        <span className="font-black tracking-[0.05em]" style={{ fontSize: s.text }}>
          VANTAGEM<span className="text-vred">.AI</span>
        </span>
        <span className="text-t4 uppercase font-semibold" style={{ fontSize: s.text * 0.38, letterSpacing: '0.25em' }}>
          Sistemas de Escala
        </span>
      </div>
    </div>
  );
}
