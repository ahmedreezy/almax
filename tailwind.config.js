/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{vue,js}'],
  prefix: 'tw-',
  important: '.dev-dash',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ink: '#080b12',
        panel: '#101620',
        line: '#243043',
        signal: '#e7b94b'
      },
      boxShadow: {
        panel: '0 18px 45px rgba(0, 0, 0, 0.24)'
      }
    }
  },
  plugins: []
}
