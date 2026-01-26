import React from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function PartnersIndex({ partners = [], flash }) {
    const { delete: destroy, processing } = useForm();

    // Handle both regular array and paginated data
    const partnerList = partners.data || partners;
    const pagination = partners.links ? partners : null;

    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Ingin menghapus mitra "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('partners.destroy', id));
            }
        });
    };

    const getLogoUrl = (partner) => {
        if (!partner.logo) return null;
        if (partner.logo.startsWith('http')) return partner.logo;
        return `/storage/${partner.logo}`;
    };

    return (
        <AdminLayout title="List Partner">
            <Head title="Partners" />

            <div className="min-h-screen bg-white py-4 px-4">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-4">
                        <div className="bg-gradient-custom rounded-t-xl shadow-lg px-5 py-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center">
                                    <i className="fas fa-handshake mr-2"></i>
                                    List Partner
                                </h2>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={route('partners.create')}
                                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all flex items-center"
                                    >
                                        <i className="fas fa-plus mr-2 text-sm"></i>
                                        Tambah Partner
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alert Messages */}
                    {/* Flash messages are handled globally */}


                    {/* Table Card */}
                    <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Logo</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Partner</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Website</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Telepon</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {partnerList.length > 0 ? partnerList.map((partner, index) => {
                                        const logoUrl = getLogoUrl(partner);
                                        return (
                                            <tr key={partner.id} className="hover:bg-blue-50 transition-colors duration-150">
                                                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    {logoUrl ? (
                                                        <img
                                                            src={logoUrl}
                                                            alt={`Logo ${partner.name}`}
                                                            className="h-10 w-10 rounded object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className={`h-10 w-10 rounded bg-gray-100 items-center justify-center ${logoUrl ? 'hidden' : 'flex'}`}>
                                                        <i className="fas fa-building text-gray-400 text-sm"></i>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 text-sm font-semibold text-gray-900">{partner.name}</td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                    {partner.website_url ? (
                                                        <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary">
                                                            {partner.website_url}
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{partner.phone || '-'}</td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${partner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {partner.status?.charAt(0).toUpperCase() + partner.status?.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Link
                                                            href={route('partners.edit', partner.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 transition-all duration-200 hover:scale-110"
                                                            title="Edit"
                                                        >
                                                            <i className="fas fa-edit text-xs"></i>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(partner.id, partner.name)}
                                                            disabled={processing}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all duration-200 hover:scale-110 disabled:opacity-50"
                                                            title="Hapus"
                                                        >
                                                            <i className="fas fa-trash-alt text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                Belum ada data mitra
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.links && (
                        <div className="mt-4 flex justify-end">
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                {pagination.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        onClick={(e) => !link.url && e.preventDefault()}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${link.active
                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                : !link.url
                                                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            } ${i === 0 ? 'rounded-l-md' : ''} ${i === pagination.links.length - 1 ? 'rounded-r-md' : ''}`}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

