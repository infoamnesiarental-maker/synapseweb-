/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        'purple-vibrant': '#A855F7',
        'blue-electric': '#3B82F6',
        'pink-neon': '#EC4899',
        // Secondary colors
        'teal': '#14B8A6',
        'cyan': '#06B6D4',
        // Neutral colors
        'black-deep': '#000000',
        'gray-dark': '#0F0F0F',
        'gray-medium': '#1F1F1F',
        'gray-light': '#A3A3A3',
        // Accent colors
        'yellow': '#FACC15',
        'green': '#10B981',
        'red': '#EF4444',
      },
      fontFamily: {
        sans: ['system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      spacing: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '48px',
        'xl': '72px',
        'xxl': '120px',
      },
      maxWidth: {
        'container': '1440px',
      },
      borderRadius: {
        'small': '8px',
        'medium': '16px',
        'large': '24px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 48px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 24px rgba(168, 85, 247, 0.3)',
      },
    },
  },
  plugins: [],
}


