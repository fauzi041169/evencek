import './bootstrap';
import './i18n';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route } from 'ziggy-js';

window.route = route;

createInertiaApp({
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);

        // Enable global drag-to-scroll
        import('./Utils/enableGlobalDragScroll').then(({ enableGlobalDragScroll }) => {
            enableGlobalDragScroll();
        });
    },
});
