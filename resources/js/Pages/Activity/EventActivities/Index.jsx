import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Plus, 
  Vote, 
  HelpCircle, 
  FileText, 
  MoreHorizontal, 
  Calendar, 
  BarChart2, 
  Edit, 
  Trash2,
  ArrowLeft
} from 'lucide-react';

export default function Index({ activity, eventActivities }) {
  const [showTypeModal, setShowTypeModal] = useState(false);

  const handleDelete = (itemId) => {
    if (confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
      router.delete(route('activity.event-activities.destroy', [activity.id, itemId]));
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'voting': return 'Voting';
      case 'quiz': return 'Kuis';
      case 'assignment': return 'Tugas';
      default: return 'Lainnya';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'voting': return 'bg-primary/10 text-primary';
      case 'quiz': return 'bg-secondary/10 text-secondary';
      case 'assignment': return 'bg-warning/10 text-warning';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateClick = (type) => {
      router.get(route('activity.event-activities.create', activity.id), { type });
  };

  return (
    <AcaraLayout
        title={`Kegiatan - ${activity.name}`}
        activity={activity}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                <div>
                    <Link 
                        href={route('activity.show', activity.slug || activity.id)}
                        className="text-sm text-primary hover:text-primary/90 flex items-center mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Kembali ke Detail Kegiatan
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Kegiatan Acara</h1>
                    <p className="text-gray-600">Kelola voting, kuis, dan aktivitas lainnya.</p>
                </div>
                <button 
                    onClick={() => setShowTypeModal(true)} 
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan
                </button>
            </div>

            {eventActivities.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center mx-4 sm:mx-0">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <BarChart2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada kegiatan</h3>
                    <p className="text-gray-500 mb-6">Mulai dengan membuat voting, kuis, atau tugas baru.</p>
                    <button 
                        onClick={() => setShowTypeModal(true)} 
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                    >
                        Buat Kegiatan Baru
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                    {eventActivities.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full overflow-hidden">
                        {item.image && (
                            <div className="w-full h-40 overflow-hidden relative group">
                                <img src={`/storage/${item.image}`} alt={item.title} className="w-full h-full object-cover transition transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                            </div>
                        )}
                        <div className="p-5 flex-grow">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                                    {getTypeLabel(item.type)}
                                </span>
                                
                                <div className="relative">
                                    {item.is_active ? (
                                        <span className="h-3 w-3 rounded-full bg-success block" title="Aktif"></span>
                                    ) : (
                                        <span className="h-3 w-3 rounded-full bg-danger block" title="Tidak Aktif"></span>
                                    )}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description || 'Tidak ada deskripsi.'}</p>
                            
                            <div className="space-y-2 text-sm text-gray-500">
                                {item.start_time && (
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>{format(new Date(item.start_time), 'd MMM yyyy HH:mm', { locale: id })}</span>
                                </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center rounded-b-lg">
                            <div className="flex items-center space-x-3">
                                <Link href={route('activity.event-activities.show', [activity.id, item.id])} className="text-primary hover:text-primary font-medium text-sm">
                                    Lihat Detail
                                </Link>
                                {item.type === 'voting' && (
                                    <Link href={route('activity.event-activities.results', [activity.id, item.id])} className="text-primary hover:text-primary font-medium text-sm flex items-center">
                                        <BarChart2 className="w-4 h-4 mr-1" /> Hasil
                                    </Link>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <Link href={route('activity.event-activities.edit', [activity.id, item.id])} className="text-gray-400 hover:text-warning transition">
                                    <Edit className="w-4 h-4" />
                                </Link>
                                <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-danger transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Modal Type Selection */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowTypeModal(false)}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Pilih Jenis Kegiatan
                                </h3>
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Voting */}
                                    <button onClick={() => handleCreateClick('voting')} className="w-full group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary hover:ring-1 hover:ring-primary focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary transition">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                                                <Vote className="w-6 h-6" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <p className="text-sm font-medium text-gray-900">Voting / Polling</p>
                                            <p className="text-sm text-gray-500 truncate">Pemilihan ketua, jajak pendapat.</p>
                                        </div>
                                    </button>

                                    {/* Quiz */}
                                    <button onClick={() => handleCreateClick('quiz')} className="w-full group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary hover:ring-1 hover:ring-primary focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary transition">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/10 text-secondary">
                                                <HelpCircle className="w-6 h-6" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <p className="text-sm font-medium text-gray-900">Kuis / Ujian</p>
                                            <p className="text-sm text-gray-500 truncate">Pilihan ganda, skor otomatis.</p>
                                        </div>
                                    </button>

                                    {/* Assignment */}
                                    <button onClick={() => handleCreateClick('assignment')} className="w-full group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-warning hover:ring-1 hover:ring-warning focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-warning transition">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-warning/10 text-warning">
                                                <FileText className="w-6 h-6" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <p className="text-sm font-medium text-gray-900">Tugas / Esai</p>
                                            <p className="text-sm text-gray-500 truncate">Jawaban panjang, upload file.</p>
                                        </div>
                                    </button>

                                    {/* Other */}
                                    <button onClick={() => handleCreateClick('other')} className="w-full group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary hover:ring-1 hover:ring-primary focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary transition">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 text-gray-600">
                                                <MoreHorizontal className="w-6 h-6" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <p className="text-sm font-medium text-gray-900">Lainnya</p>
                                            <p className="text-sm text-gray-500 truncate">Aktivitas kustom lainnya.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" onClick={() => setShowTypeModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                            Batal
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </AcaraLayout>
  );
}
