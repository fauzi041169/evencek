import './bootstrap';
import './i18n';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route } from 'ziggy-js';

window.route = route;

function updateCsrfToken(token) {
    if (!token) return;
    const meta = document.head.querySelector('meta[name="csrf-token"]');
    if (meta) meta.setAttribute('content', token);
    if (window.axios) window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}

createInertiaApp({
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        if (props?.csrf_token) {
            updateCsrfToken(props.csrf_token);
        }
        router.on('finish', (event) => {
            const token = event.detail.page?.props?.csrf_token ?? event.detail.visit?.page?.props?.csrf_token;
            if (token) updateCsrfToken(token);
        });
        router.on('error', (event) => {
            const status = event.detail.page?.status ?? event.detail.response?.status;
            const response = event.detail?.response;
            if (status === 419) {
                window.location.reload();
                return;
            }
            // Jaringan putus / connection reset / timeout – tampilkan pesan dan tawarkan reload
            const isNetworkFailure = !response || status === 0 || (response && response.status === 0);
            if (isNetworkFailure && window.Swal) {
                window.Swal.fire({
                    icon: 'warning',
                    title: 'Gagal memuat halaman',
                    text: 'Koneksi terputus atau server tidak merespons. Coba refresh halaman atau periksa koneksi internet.',
                    confirmButtonText: 'Refresh halaman'
                }).then((result) => {
                    if (result.isConfirmed) window.location.reload();
                });
            }
        });

        const root = createRoot(el);
        root.render(<App {...props} />);

        // Enable global drag-to-scroll
        import('./Utils/enableGlobalDragScroll').then(({ enableGlobalDragScroll }) => {
            enableGlobalDragScroll();
        });
    },
});
