export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  return (localStorage.getItem('vops_theme') as Theme) || 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem('vops_theme', theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyTheme(theme?: Theme): void {
  const t = theme || getTheme();
  const root = document.documentElement;
  if (t === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

// Apply immediately on import to prevent FOUC
applyTheme();

// Centralized chart color helper (used by DashboardPage, PerfilPage, RankingPage)
export function chartColors() {
  const dark = getTheme() === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
    tick: dark ? '#737373' : '#8F8F8F',
    tooltipBg: dark ? '#1F1F1F' : '#FFFFFF',
    tooltipBorder: dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(0,0,0,.08)',
    tooltipLabel: dark ? '#999' : '#6B6B6B',
    // Brand colors
    red: '#D4634B',
    green: '#5A9E6F',
    gold: '#C8963E',
    purp: '#8B7EC8',
    blue: '#6B8FBF',
  };
}
