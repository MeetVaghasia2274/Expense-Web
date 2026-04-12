/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':    'var(--bg-primary)',
        'bg-secondary':  'var(--bg-secondary)',
        'bg-tertiary':   'var(--bg-tertiary)',
        accent:          'var(--accent)',
        'accent-dim':    'var(--accent-dim)',
        'text-primary':  'var(--text-primary)',
        'text-secondary':'var(--text-secondary)',
        danger:          'var(--danger)',
        success:         'var(--success)',
        border:          'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
