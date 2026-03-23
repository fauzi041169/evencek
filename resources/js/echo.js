import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

if (typeof window !== 'undefined') {
    window.Pusher = window.Pusher || Pusher;

    const key = import.meta.env?.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env?.VITE_PUSHER_APP_CLUSTER;

    if (key) {
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key,
            cluster: cluster || 'mt1',
            forceTLS: true,
            encrypted: true,
        });
    }
}
