/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{vue,js}'],
  prefix: 'tw-',
  // Scope utilities to the Vue app so they can be adopted incrementally
  // without leaking into third-party widgets or resetting legacy styles.
  important: '#app-root',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ink: '#080b12',
        panel: '#101620',
        line: '#243043',
        signal: '#8fb3d9'
      },
      boxShadow: {
        panel: '0 18px 45px rgba(0, 0, 0, 0.24)'
      }
    }
  },
  plugins: []
}
