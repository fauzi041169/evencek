/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './resources/views/**/*.blade.php',
    './resources/js/**/*.{js,jsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
        'hero-start': 'var(--color-hero-start)',
        'hero-end': 'var(--color-hero-end)',
        'navbar-start': 'var(--color-navbar-start)',
        'navbar-end': 'var(--color-navbar-end)',
        'navbar-brand-text': 'var(--color-navbar-brand-text)',
        'navbar-link-text': 'var(--color-navbar-link-text)',
        'navbar-link-hover-bg': 'var(--color-navbar-link-hover-bg)',
        'navbar-link-active-card': 'var(--color-navbar-link-active-card)',
        'navbar-link-active-border': 'var(--color-navbar-link-active-border)',
        'card-blue': 'var(--color-card-blue)',
        'card-pink': 'var(--color-card-pink)',
        'card-green': 'var(--color-card-green)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          },
        },
        'scan-line': {
            '0%': {
                top: '0%'
            },
            '50%': {
                top: '100%'
            },
            '100%': {
                top: '0%'
            }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scan-line': 'scan-line 3s linear infinite',
      },
    },
  },
}
