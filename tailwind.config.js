/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':    '#0D1117',
        'bg-secondary':  '#161B22',
        'bg-tertiary':   '#21262D',
        accent:          '#2DD4BF',
        'accent-dim':    '#1A9E8F',
        'text-primary':  '#F0F6FC',
        'text-secondary':'#8B949E',
        danger:          '#F85149',
        success:         '#3FB950',
        border:          '#30363D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
