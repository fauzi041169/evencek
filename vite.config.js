import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        host: '127.0.0.1',
    },
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.jsx'
            ],
            refresh: true,
        }),
        react(),
    ],
    build: {
        chunkSizeWarningLimit: 1024,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', '@inertiajs/react'],
                    vendor: ['axios', 'lodash', 'date-fns'],
                    chart: ['chart.js', 'react-chartjs-2'],
                    qrcode: ['html5-qrcode', 'qrcode.react', 'react-qr-code'],
                    moveable: ['react-moveable'],
                    sweetalert2: ['sweetalert2'],
                },
            },
        },
    },
});
