import React from 'react';

export default function GallerySection({ activity, materials }) {
    return (
        <div className="p-6 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {materials.map((material) => (
                    <div key={material.id} className="group relative bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Assuming material has file_path or url. Adjust based on model */}
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                            {material.type === 'image' ? (
                                <img 
                                    src={`/storage/${material.file_path}`} 
                                    alt={material.name} 
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <i className="fas fa-file-alt text-4xl"></i>
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
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Belum ada materi atau foto di galeri.
                    </div>
                )}
            </div>
        </div>
    );
}
