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
