export function isErrorLoggingEnabled(): boolean {
  const flag = process.env.ERROR_LOGGING_ENABLED?.trim().toLowerCase()
  if (flag === 'false' || flag === '0') return false
  return true
}
