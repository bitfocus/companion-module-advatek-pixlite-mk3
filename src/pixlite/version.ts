/** Unknown strings do not prove old firmware. API support is checked separately. */
export function firmwareOutdated(value: string): boolean {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/i.exec(
    value.trim(),
  );
  if (!match) return false;
  const parts = match.slice(1, 4).map(Number);
  if (!parts.every(Number.isSafeInteger)) return false;
  for (const [index, minimum] of [3, 15, 0].entries()) {
    if (parts[index] !== minimum) return parts[index]! < minimum;
  }
  return !!match[4];
}
