export function redactForClient(value) {
  return String(value)
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '[redacted-api-key]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[redacted-token]')
    .replace(/(token(?:\s+config)?[×:=\s-]*)([A-Za-z0-9._~+/=-]{8,})/gi, '$1[redacted-token]')
    .replace(/(api[_-]?key\s*[=:]\s*)([^\s│]+)/gi, '$1[redacted-api-key]')
    .replace(/(refresh[_-]?token\s*[=:]\s*)([^\s│]+)/gi, '$1[redacted-token]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[redacted-private-key]')
}

export function redactJsonForClient(value) {
  return redactJsonValue(value)
}

function redactJsonValue(value) {
  if (Array.isArray(value)) return value.map((item) => redactJsonValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? '[redacted-secret]' : redactJsonValue(item),
      ]),
    )
  }
  if (typeof value === 'string') return redactForClient(value)
  return value
}

function isSensitiveKey(key) {
  return /token|api[_-]?key|secret|password|private[_-]?key|refresh/i.test(key)
}
