/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Background
        'dark-bg': '#1a1a2e',
        'dark-bg-secondary': '#16213e',
        'dark-bg-card': '#0f3460',
        
        // Accent Colors
        'primary-purple': '#6C63FF',
        'secondary-purple': '#9F7AEA',
        
        // Status Colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'error': '#EF4444',
        
        // Text Colors
        'text-primary': '#F9FAFB',
        'text-secondary': '#D1D5DB',
        
        // Border
        'border': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


