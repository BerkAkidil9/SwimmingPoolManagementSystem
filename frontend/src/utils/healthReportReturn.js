// Only report-upload pages may be used as a post-login destination.
export function getHealthReportReturnPath(value) {
  if (typeof value !== 'string' || value.length > 256) return null;
  const match = value.match(/^\/(?:upload-health-report(?:\/[1-9]\d*)?|health-report-upload)(?:\?userId=[1-9]\d*)?$/);
  return match?.[0] === value ? value : null;
}
