const PREVIEW_KEY = 'almaxDevPreview'

const isLocalHost = () => typeof window !== 'undefined' && [
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]'
].includes(window.location.hostname)

export const isDevPreviewAvailable = () => isLocalHost()

export const isDevPreviewEnabled = () => isLocalHost() && localStorage.getItem(PREVIEW_KEY) === '1'

export const enableDevPreview = () => {
  if (isLocalHost()) localStorage.setItem(PREVIEW_KEY, '1')
}

export const disableDevPreview = () => localStorage.removeItem(PREVIEW_KEY)
