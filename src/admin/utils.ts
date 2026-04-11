/** Extract YouTube video ID from a URL or raw ID */
export function parseYouTubeId(input: string): string {
  const s = input.trim();
  if (!s) return '';
  // youtu.be/ID
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com/watch?v=ID
  const long = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (long) return long[1];
  // youtube.com/embed/ID or /v/ID
  const embed = s.match(/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  // raw ID (exactly 11 valid chars)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  // return as-is if nothing matched (user can fix manually)
  return s;
}

/** Trigger a JSON file download */
export function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
