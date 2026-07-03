export function maskSecret(value: string | null, visible = 4): string {
  if (!value) return '—'
  if (value.length <= visible * 2) return '••••••••'
  return `${value.slice(0, visible)}••••${value.slice(-visible)}`
}
