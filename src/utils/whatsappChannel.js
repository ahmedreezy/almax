export const DEFAULT_WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VbDlmLz9Bb5xVZ7OJz0O'

export function resolveWhatsAppChannel(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  return /^https:\/\/whatsapp\.com\/channel\/[a-z0-9]+\/?$/i.test(url)
    ? url
    : DEFAULT_WHATSAPP_CHANNEL
}
