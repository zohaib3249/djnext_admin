import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Ensure layout classes are never purged
  safelist: [
    'layout-basic',
    'layout-glassmorphism',
    'layout-aurora',
    'layout-neumorphism',
    'layout-minimal',
    'dark',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--background-secondary)',
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          muted: 'var(--foreground-muted)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        success: { DEFAULT: 'var(--success)' },
        warning: { DEFAULT: 'var(--warning)' },
        destructive: { DEFAULT: 'var(--destructive)' },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
        card: {
          DEFAULT: 'var(--card)',
          hover: 'var(--card-hover)',
        },
        input: {
          DEFAULT: 'var(--input)',
          border: 'var(--input-border)',
        },
        skeleton: {
          DEFAULT: 'var(--skeleton)',
          shine: 'var(--skeleton-shine)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
