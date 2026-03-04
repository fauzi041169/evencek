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
        return Promise.reject(err);
    }
);
