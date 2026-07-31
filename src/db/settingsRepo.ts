import { getDatabase } from './database';

export function getSetting(key: string): string | null {
  const db = getDatabase();
  const result = db.executeSync('SELECT value FROM settings WHERE key = ?', [key]);
  if (!result.rows || result.rows.length === 0) return null;
  return (result.rows[0] as any).value as string;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.executeSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}
