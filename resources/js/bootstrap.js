import axios from 'axios';
window.axios = axios;

import Swal from 'sweetalert2';
window.Swal = Swal;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Timeout untuk jaringan lambat (45 detik) – kurangi error "loading lama" / hang
window.axios.defaults.timeout = 45000;

// Add CSRF Token to Axios
const token = document.head.querySelector('meta[name="csrf-token"]');

if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

// Tangani error jaringan (ERR_NETWORK, ERR_CONNECTION_RESET, dll) agar tidak Uncaught AxiosError
const isNetworkError = (err) => {
    if (!err || !err.code) return false;
    return err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error';
};

const showNetworkErrorOnce = (() => {
    let shown = false;
    return () => {
        if (shown) return;
        shown = true;
        if (window.Swal) {
            window.Swal.fire({
                icon: 'warning',
                title: 'Koneksi bermasalah',
                text: 'Periksa koneksi internet Anda dan coba lagi. Jika masalah berlanjut, coba refresh halaman atau akses dari jaringan lain.',
                confirmButtonText: 'Mengerti'
            }).then(() => { shown = false; });
        }
    };
})();

// Retry sekali untuk GET saat network error (berguna di jaringan tidak stabil)
const MAX_RETRY = 1;
window.axios.interceptors.request.use((config) => {
    config._retryCount = config._retryCount ?? 0;
    return config;
});

window.axios.interceptors.response.use(
    (response) => response,
    async (err) => {
        const config = err.config || {};
        const canRetry = config.method === 'get' && (config._retryCount ?? 0) < MAX_RETRY && isNetworkError(err);

        if (canRetry) {
            config._retryCount = (config._retryCount ?? 0) + 1;
            await new Promise((r) => setTimeout(r, 1500));
            return window.axios.request(config);
        }

        if (isNetworkError(err)) {
            showNetworkErrorOnce();
        }
        const status = err?.response?.status;
        if (typeof status === 'number' && status >= 500) {
            const data = err?.response?.data;
            const headerRequestId = err?.response?.headers?.['x-request-id'];
            let message = `Terjadi kesalahan server (HTTP ${status}). Silakan coba lagi.`;
            if (data) {
                if (typeof data === 'string' && data.length < 300) {
                    message = data;
                } else if (typeof data?.message === 'string') {
                    message = data.message;
                }
                if (typeof data?.request_id === 'string') {
                    message = `${message} (Request ID: ${data.request_id})`;
                }
            }
            if (headerRequestId && typeof headerRequestId === 'string' && !message.includes(headerRequestId)) {
                message = `${message} (Request ID: ${headerRequestId})`;
            }
            window.dispatchEvent(new CustomEvent('app:flash', { detail: { error: message } }));
        }
        return Promise.reject(err);
    }
);

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
        try {
            const res = await originalFetch(...args);
            if (!res.ok && typeof res.status === 'number' && res.status >= 500) {
                (async () => {
                    let message = `Terjadi kesalahan server (HTTP ${res.status}). Silakan coba lagi.`;
                    try {
                        const ct = res.headers?.get?.('content-type') || '';
                        if (ct.includes('application/json')) {
                            const data = await res.clone().json();
                            if (data?.message && typeof data.message === 'string') {
                                message = data.message;
                            }
                            if (data?.request_id && typeof data.request_id === 'string') {
                                message = `${message} (Request ID: ${data.request_id})`;
                            }
                        } else {
                            const text = await res.clone().text();
                            if (text && typeof text === 'string' && text.length < 300) {
                                message = text;
                            }
                        }
                        const reqId = res.headers?.get?.('x-request-id');
                        if (reqId && typeof reqId === 'string' && !message.includes(reqId)) {
                            message = `${message} (Request ID: ${reqId})`;
                        }
                    } catch (e) {
                    }
                    window.dispatchEvent(new CustomEvent('app:flash', { detail: { error: message } }));
                })();
            }
            return res;
        } catch (err) {
            throw err;
        }
    };
}
