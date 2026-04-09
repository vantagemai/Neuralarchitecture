interface AvatarProps {
  userId: string;
  name: string;
  size?: string; // Tailwind class like 'w-8 h-8'
  ring?: boolean;
  className?: string;
}

export function Avatar({ userId, name, size = 'w-8 h-8', ring = false, className = '' }: AvatarProps) {
  const url = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const img = url ? (
    <img src={url} alt={name} className={`${size} rounded-full object-cover ${className}`} />
  ) : (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ fontSize: size.includes('12') ? '16px' : size.includes('10') ? '13px' : '11px' }}
    >
      {initials}
    </div>
  );

  if (ring) return <div className="tv-avatar-ring shrink-0">{img}</div>;
  return <div className="shrink-0">{img}</div>;
}
