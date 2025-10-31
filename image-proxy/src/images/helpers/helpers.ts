export const normalizeMime = (s: string) => s.trim().toLowerCase();
export const equalsMime = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const alias = (m: string) => (m === 'image/jpg' ? 'image/jpeg' : m);
  return alias(a) === alias(b);
};
