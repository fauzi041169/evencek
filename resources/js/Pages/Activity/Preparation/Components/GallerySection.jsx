import React from 'react';
import { FileText } from 'lucide-react';

export default function GallerySection({ activity, materials }) {
    return (
        <div className="p-8 bg-white font-primary">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {materials.map((material) => (
                    <div key={material.id} className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                            {material.file_type === 'image' ? (
                                <img
                                    src={route('activity.preparation.serve-material', [activity.uid || activity.id, material.uid || material.id])}
                                    alt={material.name}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <FileText className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="text-sm font-medium text-gray-900 truncate" title={material.name}>
                                {material.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {material.created_at ? new Date(material.created_at).toLocaleDateString() : ''}
                            </p>
                        </div>
                    </div>
                ))}

                {materials.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                            <i className="fas fa-images text-2xl"></i>
                        </div>
                        <p className="text-gray-500 font-medium">Belum ada foto kegiatan di galeri.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
