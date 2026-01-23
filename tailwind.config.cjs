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
    },
  },
}
