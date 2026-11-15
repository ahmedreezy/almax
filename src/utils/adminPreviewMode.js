const PREVIEW_KEY = 'almaxAdminPreview'

export const isAdminPreviewAvailable = () => typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname)
export const isAdminPreviewEnabled = () => isAdminPreviewAvailable() && localStorage.getItem(PREVIEW_KEY) === '1'
export const enableAdminPreview = () => { if (isAdminPreviewAvailable()) localStorage.setItem(PREVIEW_KEY, '1') }
export const disableAdminPreview = () => localStorage.removeItem(PREVIEW_KEY)
