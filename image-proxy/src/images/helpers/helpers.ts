import { BadRequestException } from '@nestjs/common';

type Cursor = { createdAt: string; id: string };

export const normalizeMime = (s: string) => s.trim().toLowerCase();
export const equalsMime = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const alias = (m: string) => (m === 'image/jpg' ? 'image/jpeg' : m);
  return alias(a) === alias(b);
};
export function encodeCursor(c: Cursor): string {
  const b64 = Buffer.from(JSON.stringify(c)).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeCursor(cursor: string): {
  createdAt: string;
  id: string;
} {
  try {
    const pad = cursor + '==='.slice((cursor.length + 3) % 4);
    const b64 = pad.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const obj = JSON.parse(decoded) as { createdAt: string; id: string };

    if (
      typeof obj !== 'object' ||
      typeof obj?.createdAt !== 'string' ||
      typeof obj?.id !== 'string'
    ) {
      throw new Error('Invalid cursor shape');
    }

    return obj;
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}
