import fs from 'fs';
import path from 'path';

export function loadSystemPrompt(): string {
  const filePath = path.join(process.cwd(), 'kyoto-context', 'system-prompt.md');
  return fs.readFileSync(filePath, 'utf-8');
}
