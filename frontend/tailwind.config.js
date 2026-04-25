/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#111827',
        'bg-surface': 'rgba(17, 24, 39, 0.8)',
        'bg-sidebar': '#0d1117',
        
        // Accent colors
        'accent-primary': '#00d4ff',
        'accent-secondary': '#6366f1',
        'accent-glow': 'rgba(0, 212, 255, 0.3)',
        
        // Text colors
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        
        // Border colors
        'border-default': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(0, 212, 255, 0.3)',
        'border-active': 'rgba(0, 212, 255, 0.5)',
        
        // Message surfaces
        'message-user': 'linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)',
        'message-ai': 'rgba(30, 41, 59, 0.8)',
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '12px',
      },
      boxShadow: {
        'glow': '0 0 0 2px rgba(0, 212, 255, 0.2), 0 0 20px rgba(0, 212, 255, 0.1)',
        'glow-hover': '0 0 0 2px rgba(0, 212, 255, 0.3), 0 0 30px rgba(0, 212, 255, 0.2)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)',
        'gradient-user-message': 'linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5', boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
