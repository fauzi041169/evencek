import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.content;
const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
const pusherHost = import.meta.env.VITE_PUSHER_HOST;

if (typeof window !== 'undefined' && pusherKey && pusherHost) {
    window.Pusher = Pusher;

    const scheme = import.meta.env.VITE_PUSHER_SCHEME || window.location.protocol.replace(':', '');
    const isSecure = scheme === 'https';
    const port = Number(import.meta.env.VITE_PUSHER_PORT || (isSecure ? 443 : 80));

    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: pusherKey,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
        wsHost: pusherHost,
        wsPort: port,
        wssPort: port,
        forceTLS: isSecure,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    });
}
