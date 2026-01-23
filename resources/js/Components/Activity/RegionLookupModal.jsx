import React, { useState, useEffect } from 'react';

export default function RegionLookupModal({ isOpen, onClose }) {
    const [provinces, setProvinces] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [regencies, setRegencies] = useState([]);
    const [selectedRegency, setSelectedRegency] = useState('');
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetch(route('profile.ajax.provinces'))
                .then(res => res.json())
                .then(data => setProvinces(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedProvince) {
            fetch(route('profile.ajax.regencies', selectedProvince))
                .then(res => res.json())
                .then(data => setRegencies(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        } else {
            setRegencies([]);
        }
        setSelectedRegency('');
        setSelectedDistrict('');
    }, [selectedProvince]);

    useEffect(() => {
        if (selectedRegency) {
            fetch(route('profile.ajax.districts', selectedRegency))
                .then(res => res.json())
                .then(data => setDistricts(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        } else {
            setDistricts([]);
        }
        setSelectedDistrict('');
    }, [selectedRegency]);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100200] overflow-y-auto" aria-labelledby="region-lookup-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle">
                    <div className="bg-purple-600 px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white" id="region-lookup-title">Cari Kode Wilayah</h3>
                        <button onClick={onClose} className="text-purple-100 hover:text-white focus:outline-none">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <p className="text-sm text-gray-600 mb-4">Pilih wilayah untuk melihat kodenya. Gunakan kode ini di kolom Excel (province_id, regency_id, district_id).</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {/* Province */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                                <select 
                                    value={selectedProvince} 
                                    onChange={(e) => setSelectedProvince(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Provinsi --</option>
                                    {provinces.map(prov => (
                                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                                    ))}
                                </select>
                                <div className="mt-2 text-sm flex items-center">
                                    <span className="font-medium text-gray-500">Provinsi:</span>
                                    <span className={`ml-2 font-mono font-bold text-lg ${copiedId === 'prov' ? 'text-green-600' : 'text-purple-600'}`}>
                                        {selectedProvince || '-'}
                                    </span>
                                    {selectedProvince && (
                                        <button onClick={() => copyToClipboard(selectedProvince, 'prov')} className="ml-2 text-xs text-gray-400 hover:text-purple-600" title="Salin">
                                            <i className="far fa-copy"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Regency */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
                                <select 
                                    value={selectedRegency} 
                                    onChange={(e) => setSelectedRegency(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                    disabled={!selectedProvince}
                                >
                                    <option value="">-- Pilih Kabupaten/Kota --</option>
                                    {regencies.map(reg => (
                                        <option key={reg.id} value={reg.id}>{reg.name}</option>
                                    ))}
                                </select>
                                <div className="mt-2 text-sm flex items-center">
                                    <span className="font-medium text-gray-500">Kab/Kota:</span>
                                    <span className={`ml-2 font-mono font-bold text-lg ${copiedId === 'reg' ? 'text-green-600' : 'text-purple-600'}`}>
                                        {selectedRegency || '-'}
                                    </span>
                                    {selectedRegency && (
                                        <button onClick={() => copyToClipboard(selectedRegency, 'reg')} className="ml-2 text-xs text-gray-400 hover:text-purple-600" title="Salin">
                                            <i className="far fa-copy"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* District */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                                <select 
                                    value={selectedDistrict} 
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                    disabled={!selectedRegency}
                                >
                                    <option value="">-- Pilih Kecamatan --</option>
                                    {districts.map(dist => (
                                        <option key={dist.id} value={dist.id}>{dist.name}</option>
                                    ))}
                                </select>
                                <div className="mt-2 text-sm flex items-center">
                                    <span className="font-medium text-gray-500">Kecamatan:</span>
                                    <span className={`ml-2 font-mono font-bold text-lg ${copiedId === 'dist' ? 'text-green-600' : 'text-purple-600'}`}>
                                        {selectedDistrict || '-'}
                                    </span>
                                    {selectedDistrict && (
                                        <button onClick={() => copyToClipboard(selectedDistrict, 'dist')} className="ml-2 text-xs text-gray-400 hover:text-purple-600" title="Salin">
                                            <i className="far fa-copy"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
