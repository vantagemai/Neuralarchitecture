import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  drift: number;
}

let triggerFn: (() => void) | null = null;

export function triggerConfetti() {
  triggerFn?.();
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#F97316'];

export function ConfettiContainer() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    triggerFn = () => {
      const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        size: 4 + Math.random() * 6,
        drift: -30 + Math.random() * 60,
      }));
      setParticles(newParticles);
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    };
    return () => { triggerFn = null; };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
