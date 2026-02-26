import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function ApiMonitorIndex({ 
    apiRoutes = [], 
    summary = {}, 
    byRoute = [], 
    logs = [], 
    filters = {} 
}) {
    const [selectedApi, setSelectedApi] = useState(apiRoutes[0]?.uri || '');
    const [method, setMethod] = useState('GET');
    const [pathParamId, setPathParamId] = useState('1');
    const [queryParams, setQueryParams] = useState('');
    const [headers, setHeaders] = useState('');
    const [body, setBody] = useState('');
    const [result, setResult] = useState('');
    const [resultMeta, setResultMeta] = useState('');
    const [filterHours, setFilterHours] = useState(filters.hours || 24);
    const [filterMethod, setFilterMethod] = useState(filters.method || '');
    const [filterRoute, setFilterRoute] = useState(filters.route || '');

    const hits = parseInt(summary.hits || 0);
    const errHits = parseInt(summary.error_hits || 0);
    const errorRate = hits > 0 ? ((errHits / hits) * 100).toFixed(1) : 0;

    const getAvailableMethods = () => {
        const route = apiRoutes.find(r => r.uri === selectedApi);
        return route?.methods?.length ? route.methods : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    };

    const needsIdParam = selectedApi.includes('{id}');

    const getToken = () => {
        try {
            const t = localStorage.getItem('apiTestToken');
            return t && t.trim().length > 0 ? t : 'xxxxxx';
        } catch (e) {
            return 'xxxxxx';
        }
    };

    const applyPreset = () => {
        const token = getToken();
        let defaultHeaders = [];
        let defaultBody = '';

        if (selectedApi === 'api/auth/login') {
            defaultHeaders.push('Content-Type: application/json');
            defaultBody = JSON.stringify({ email: 'officeadmin@adzkiatekno.com', password: '1234567890' }, null, 2);
            setMethod('POST');
        } else if (selectedApi === 'api/auth/register') {
            defaultHeaders.push('Content-Type: application/json');
            defaultBody = JSON.stringify({ name: 'Nama Pengguna', email: 'user@example.com', password: 'password', password_confirmation: 'password', phone: '08xxxx' }, null, 2);
            setMethod('POST');
        } else if (selectedApi === 'api/profile') {
            defaultHeaders.push(`Authorization: Bearer ${token}`);
        } else if (selectedApi === 'api/activities') {
            defaultHeaders.push(`Authorization: Bearer ${token}`);
            setQueryParams('page=1&per_page=10');
        } else if (selectedApi.includes('{id}')) {
            defaultHeaders.push(`Authorization: Bearer ${token}`);
        }

        setHeaders(defaultHeaders.join('\n'));
        setBody(defaultBody);
    };

    const handleApiChange = (e) => {
        setSelectedApi(e.target.value);
        setQueryParams('');
        setBody('');
    };

    const runApiTest = async () => {
        let uri = selectedApi;
        if (needsIdParam) {
            uri = uri.replace('{id}', pathParamId || '1');
        }

        const qs = queryParams.trim();
        const url = `${window.location.origin}/${uri}${qs ? '?' + qs : ''}`;

        const parsedHeaders = {};
        headers.split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
        });

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrfToken && !parsedHeaders['X-CSRF-TOKEN']) {
            parsedHeaders['X-CSRF-TOKEN'] = csrfToken;
        }

        const opts = { method, headers: parsedHeaders };
        if (method !== 'GET' && method !== 'DELETE') {
            if (!parsedHeaders['Content-Type']) parsedHeaders['Content-Type'] = 'application/json';
            opts.body = body.trim() || '{}';
        }

        const t0 = performance.now();
        try {
            const resp = await fetch(url, opts);
            const t1 = performance.now();
            setResultMeta(`Status ${resp.status} - ${Math.round(t1 - t0)} ms`);

            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const json = await resp.json();
                if (json?.data?.token) {
                    localStorage.setItem('apiTestToken', json.data.token);
                }
                setResult(JSON.stringify(json, null, 2));
            } else {
                const text = await resp.text();
                setResult(text);
            }
        } catch (e) {
            setResultMeta('Gagal');
            setResult(String(e));
        }
    };

    const handleFilter = (e) => {
        e.preventDefault();
        router.get(route('api-monitor.index'), {
            hours: filterHours,
            method: filterMethod,
            route: filterRoute,
        }, { preserveState: true });
    };

    const byRouteList = byRoute?.data || byRoute || [];
    const logsList = logs?.data || logs || [];

    return (
        <AdminLayout title="API Monitor">
            <Head title="API Monitor" />

            <div className="py-4 px-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Monitoring API</h1>
                    <p className="text-gray-600">Cek dan pantau penggunaan API untuk aplikasi Flutter</p>
                </div>

                {/* API Test Section */}
                <div className="bg-white rounded-xl shadow-md mb-6">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <strong>Daftar API Aplikasi & Uji Cepat</strong>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih API</label>
                                <select
                                    value={selectedApi}
                                    onChange={handleApiChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    {apiRoutes.map((route, idx) => (
                                        <option key={idx} value={route.uri}>
                                            {route.uri} {route.name ? `(${route.name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    {getAvailableMethods().map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {needsIdParam && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Activity ID</label>
                                <input
                                    type="text"
                                    value={pathParamId}
                                    onChange={(e) => setPathParamId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder="1"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Query Params</label>
                            <input
                                type="text"
                                value={queryParams}
                                onChange={(e) => setQueryParams(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="page=1&limit=10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Headers</label>
                            <textarea
                                value={headers}
                                onChange={(e) => setHeaders(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                placeholder="Authorization: Bearer xxxxxx"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body JSON</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows="6"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                placeholder='{"key":"value"}'
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={applyPreset}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                            >
                                <i className="fas fa-magic mr-2"></i>Auto Fill
                            </button>
                            <button
                                onClick={runApiTest}
                                className="px-4 py-2 bg-secondary hover:bg-blue-700 text-white rounded-lg"
                            >
                                <i className="fas fa-play mr-2"></i>Uji API
                            </button>
                        </div>

                        {/* Result */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200">
                            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                <span className="font-medium">Hasil</span>
                                <span className="text-sm text-gray-500">{resultMeta}</span>
                            </div>
                            <pre className="p-4 text-sm overflow-auto max-h-80 whitespace-pre-wrap">{result || 'Belum ada hasil'}</pre>
                        </div>
                    </div>
                </div>

                {/* Monitoring Filter */}
                <form onSubmit={handleFilter} className="bg-white rounded-xl shadow-md mb-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Waktu (jam)</label>
                            <input
                                type="number"
                                value={filterHours}
                                onChange={(e) => setFilterHours(e.target.value)}
                                min="1"
                                max="720"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                            <select
                                value={filterMethod}
                                onChange={(e) => setFilterMethod(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Semua</option>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Route</label>
                            <input
                                type="text"
                                value={filterRoute}
                                onChange={(e) => setFilterRoute(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="/dashboard, api/activities, ..."
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-secondary hover:bg-blue-700 text-white rounded-lg"
                        >
                            <i className="fas fa-search mr-2"></i>Filter
                        </button>
                    </div>
                </form>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-gray-500 text-sm mb-1">Total Hits</div>
                        <div className="text-2xl font-bold">{hits.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-gray-500 text-sm mb-1">Rata-rata Durasi (ms)</div>
                        <div className="text-2xl font-bold">{Math.round(summary.avg_dur || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-gray-500 text-sm mb-1">Durasi Maks (ms)</div>
                        <div className="text-2xl font-bold">{Math.round(summary.max_dur || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-gray-500 text-sm mb-1">Error (4xx/5xx)</div>
                        <div className="text-2xl font-bold">
                            {errHits} <span className="text-sm text-gray-500">({errorRate}%)</span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                            errorRate > 3 ? 'bg-red-100 text-red-800' :
                            errorRate > 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                            {errorRate > 3 ? 'High' : errorRate > 1 ? 'Med' : 'Low'}
                        </span>
                    </div>
                </div>

                {/* Routes Summary */}
                <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <strong>Ringkasan per Route</strong>
                        <span className="text-sm text-gray-500">Urut berdasarkan rata-rata durasi</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route/Path</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hits</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Dur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Dur</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {byRouteList.length > 0 ? byRouteList.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs mr-2">{r.method}</span>
                                            {r.route_key}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{r.method}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{parseInt(r.hits)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{Math.round(r.avg_dur)} ms</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{Math.round(r.max_dur)} ms</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Tidak ada data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Logs */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <strong>Log Terbaru</strong>
                        <span className="text-sm text-gray-500">20 entri terakhir</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durasi</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logsList.length > 0 ? logsList.map((log, idx) => {
                                    const status = parseInt(log.status_code || 200);
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">{log.method}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{log.uri}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs ${
                                                    status >= 500 ? 'bg-red-100 text-red-800' :
                                                    status >= 400 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{parseInt(log.duration_ms)} ms</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{log.user_id || '-'}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Tidak ada data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

