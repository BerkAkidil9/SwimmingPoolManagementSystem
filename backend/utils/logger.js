// Only pass fixed operation labels here. Error messages, stacks, provider
// responses and request objects can contain credentials or personal data.
const safeCodes = new Set([
  'invalid_grant', 'invalid_client', 'unauthorized_client', 'access_denied',
  'invalid_request', 'invalid_scope', 'insufficient_scope',
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED',
  'ETIMEDOUT', 'EPIPE', 'ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE',
  '23502', '23503', '23505', '23514', '22P02', '28P01', '42P01', '42703',
  '40001', '40P01', '53300', '57P01', '08001', '08006',
  'LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE',
  'card_declined', 'expired_card', 'incorrect_cvc', 'processing_error',
  'authentication_required',
]);

function logError(event, error) {
  const details = {};
  const code = [error?.code, error?.response?.data?.error, error?.raw?.code]
    .find(value => typeof value === 'string' && safeCodes.has(value));
  const status = error?.response?.status ?? error?.statusCode ?? error?.status;

  if (code) details.code = code;
  if (Number.isInteger(status) && status >= 100 && status <= 599) {
    details.status = status;
  }

  if (Object.keys(details).length) console.error(event, details);
  else console.error(event);
}

module.exports = { logError };
