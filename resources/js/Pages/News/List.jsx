import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function List({ news }) {
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Berita yang dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('news.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire('Terhapus!', 'Berita telah dihapus.', 'success')
                });
            }
        });
    };

    const formatDate = (date) => format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: id });

    return (
        <MainLayout>
            <Head title="Manajemen Berita" />

            <div className="py-2 sm:py-6 min-h-screen bg-gray-50">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Manajemen Berita</h1>
                        <Link
                            href={route('news.create')}
                            className="bg-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center shadow-md"
                        >
                            <i className="fas fa-plus mr-2"></i> Buat Berita
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {news && news.data && Array.isArray(news.data) && news.data.length > 0 ? (
                                        news.data.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0">
                                                            <img
                                                                className="h-10 w-10 rounded-lg object-cover"
                                                                src={item.image ? (item.image.startsWith('http') ? item.image : `/storage/${item.image}`) : '/assets/images/news/default-news.jpg'}
                                                                alt=""
                                                            />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs" title={item.title}>
                                                                {item.title}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {item.featured ? <span className="text-yellow-600 text-xs"><i className="fas fa-star mr-1"></i> Featured</span> : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.category?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {item.status === 'published' ? 'Published' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.views_count}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <Link
                                                            href={route('news.show', item.slug)}
                                                            className="text-secondary hover:text-blue-900 bg-blue-50 hover:bg-secondary/10 p-2 rounded-lg transition"
                                                            title="Lihat"
                                                        >
                                                            <i className="far fa-eye"></i>
                                                        </Link>
                                                        <Link
                                                            href={route('news.edit', item.id)}
                                                            className="text-primary hover:text-indigo-900 bg-indigo-50 hover:bg-primary/10 p-2 rounded-lg transition"
                                                            title="Edit"
                                                        >
                                                            <i className="far fa-edit"></i>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition"
                                                            title="Hapus"
                                                        >
                                                            <i className="far fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-2 sm:py-6 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                        <i className="far fa-newspaper text-2xl text-gray-400"></i>
                                                    </div>
                                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Belum ada berita</h3>
                                                    <p className="text-gray-500 text-sm">Mulai buat berita baru untuk ditampilkan</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {news.links && news.links.length > 3 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-center">
                                    <div className="flex flex-wrap gap-1">
                                        {news.links.map((link, i) => (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                className={`px-3 py-1 text-sm rounded-md transition-colors ${link.active
                                                        ? 'bg-secondary text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

