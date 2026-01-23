import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

export default function RegionLookupModal({ isOpen, onClose, provinces, regencies, districts }) {
    if (!isOpen) return null;

    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedRegency, setSelectedRegency] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    const filteredRegencies = useMemo(() => {
        if (!selectedProvince) return [];
        return regencies.filter(r => r.province_id === selectedProvince);
    }, [selectedProvince, regencies]);

    const filteredDistricts = useMemo(() => {
        if (!selectedRegency) return [];
        return districts.filter(d => d.regency_id === selectedRegency);
    }, [selectedRegency, districts]);

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle">
                    <div className="bg-primary px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Cari Kode Wilayah</h3>
                        <button onClick={onClose} className="text-purple-100 hover:text-white focus:outline-none">
                            <X className="w-6 h-6" />
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
                                    onChange={(e) => {
                                        setSelectedProvince(e.target.value);
                                        setSelectedRegency('');
                                        setSelectedDistrict('');
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Provinsi --</option>
                                    {provinces.map(prov => (
                                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                                    ))}
                                </select>
                                {selectedProvince && (
                                    <div className="mt-2 text-sm">
                                        Kode Provinsi: <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{selectedProvince}</span>
                                    </div>
                                )}
                            </div>

                            {/* Regency */}
                            <div className={`bg-gray-50 p-3 rounded-lg border border-gray-200 ${!selectedProvince ? 'opacity-50' : ''}`}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
                                <select 
                                    value={selectedRegency}
                                    onChange={(e) => {
                                        setSelectedRegency(e.target.value);
                                        setSelectedDistrict('');
                                    }}
                                    disabled={!selectedProvince}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Kabupaten/Kota --</option>
                                    {filteredRegencies.map(reg => (
                                        <option key={reg.id} value={reg.id}>{reg.name}</option>
                                    ))}
                                </select>
                                {selectedRegency && (
                                    <div className="mt-2 text-sm">
                                        Kode Kab/Kota: <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{selectedRegency}</span>
                                    </div>
                                )}
                            </div>

                            {/* District */}
                            <div className={`bg-gray-50 p-3 rounded-lg border border-gray-200 ${!selectedRegency ? 'opacity-50' : ''}`}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                                <select 
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    disabled={!selectedRegency}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                                >
                                    <option value="">-- Pilih Kecamatan --</option>
                                    {filteredDistricts.map(dist => (
                                        <option key={dist.id} value={dist.id}>{dist.name}</option>
                                    ))}
                                </select>
                                {selectedDistrict && (
                                    <div className="mt-2 text-sm">
                                        Kode Kecamatan: <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{selectedDistrict}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 sm:w-auto sm:text-sm">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

