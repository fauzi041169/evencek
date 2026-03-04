# Troubleshooting: Error Jaringan di Lokasi / Komputer Tertentu

Jika pengguna melaporkan error seperti di bawah saat akses **online** dari lokasi atau komputer tertentu:

- `defoult.webp:1 Failed to load resource: net::ERR_HTTP2_PING_FAILED`
- `/activity/xxx:1 Failed to load resource: net::ERR_CONNECTION_RESET`
- `Uncaught (in promise) AxiosError { message: 'Network Error', code: 'ERR_NETWORK' }`
- **Loading sangat lama** atau **halaman tidak terbuka sama sekali**

Penyebab utama adalah **kondisi jaringan atau konfigurasi server**, bukan bug kode aplikasi.

---

## 1. Arti error

| Error | Arti singkat |
|-------|----------------|
| **ERR_HTTP2_PING_FAILED** | Koneksi HTTP/2 ke server putus (ping keepalive gagal). Sering terjadi di jaringan tidak stabil, proxy, atau firewall. |
| **ERR_CONNECTION_RESET** | Koneksi TCP di-reset (server/network memutus koneksi). Bisa karena timeout, firewall, atau server sibuk. |
| **Axios ERR_NETWORK** | Request (XHR/fetch) gagal karena koneksi putus, timeout, atau CORS/SSL. |
| **Loading lama / tidak terbuka** | Request menunggu respons terlalu lama atau putus di tengah jalan. |

---

## 2. Yang sudah dilakukan di aplikasi (frontend)

- **Timeout Axios** 45 detik agar request tidak hang tanpa batas.
- **Retry otomatis** 1x untuk request GET saat terjadi network error.
- **Pesan ramah** saat network error (modal “Koneksi bermasalah” / “Gagal memuat halaman”) dan opsi refresh.

Ini mengurangi “Uncaught AxiosError” dan memberi umpan balik ke pengguna, tetapi **tidak menyelesaikan** koneksi putus atau ping failed di sisi jaringan/server.

---

## 3. Rekomendasi di sisi server / hosting

Lakukan di server yang menjalankan aplikasi (nginx, Apache, PHP, atau panel hosting).

### 3.1 Nginx (jika dipakai)

- **Nonaktifkan HTTP/2** untuk uji coba (banyak kasus ERR_HTTP2_PING_FAILED berkurang):
  - Di `server { ... }` hapus atau komentar `http2` dari `listen`, misalnya:
    - Dari: `listen 443 ssl http2;`
    - Menjadi: `listen 443 ssl;`
  - Restart nginx.
- **Naikkan timeout** agar koneksi lambat tidak cepat putus:
  ```nginx
  proxy_connect_timeout 60s;
  proxy_send_timeout 60s;
  proxy_read_timeout 60s;
  keepalive_timeout 65s;
  ```
- Pastikan **SSL** tidak bermasalah (sertifikat valid, tidak kadaluarsa).

### 3.2 Apache (jika dipakai)

- Pastikan **mod_http2** tidak menyebabkan masalah; bisa dicoba nonaktifkan untuk uji.
- Naikkan **Timeout** (misalnya di konfigurasi virtual host atau `.htaccess`):
  ```apache
  Timeout 60
  ```

### 3.3 PHP (Laravel)

- **max_execution_time** cukup besar (misalnya 60) agar request berat tidak di-kill oleh PHP.
- **memory_limit** cukup untuk ukuran response halaman (mis. 256M atau lebih jika halaman besar).

### 3.4 Hosting / firewall

- Pastikan **firewall** atau **WAF** tidak memutus koneksi panjang (long request) atau HTTP/2.
- Jika ada **CDN/proxy** (Cloudflare, dll.), cek apakah “Keepalive” atau “HTTP/2” bisa diubah atau diuji mati.
- **Rate limiting** yang terlalu ketat bisa memutus koneksi; longgar-kan untuk halaman biasa jika perlu.

---

## 4. Yang bisa dicoba pengguna (di lokasi bermasalah)

- **Refresh** halaman atau klik “Refresh halaman” di modal error.
- **Coba jaringan lain** (Wi‑Fi lain, hotspot HP) untuk memastikan apakah masalah di jaringan itu.
- **Coba browser lain** (Chrome, Edge, Firefox).
- **Nonaktifkan VPN** jika dipakai; kadang VPN memutus HTTP/2 atau koneksi panjang.
- **Bersihkan cache** browser untuk halaman situs.

---

## 5. Ringkasan

- Error **ERR_HTTP2_PING_FAILED**, **ERR_CONNECTION_RESET**, dan **Axios ERR_NETWORK** di lokasi/komputer tertentu umumnya akibat **jaringan tidak stabil** atau **konfigurasi server (HTTP/2, timeout, keepalive)**.
- Aplikasi sudah ditambah **timeout, retry, dan pesan error** agar tidak hang dan tidak “Uncaught”.
- Untuk mengurangi error dan loading lama, lakukan penyesuaian di **server (nginx/Apache/PHP)** dan **jaringan/hosting** seperti di atas.
