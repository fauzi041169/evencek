import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function CategoryManager({ initialCategories, selectedId, onChange, error }) {
    const [categories, setCategories] = useState(initialCategories || []);
    const [loading, setLoading] = useState(false);

    // Update local categories if initialCategories prop changes
    useEffect(() => {
        if (initialCategories) {
            setCategories(initialCategories);
        }
    }, [initialCategories]);

    const handleAdd = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Tambah Kategori Baru',
            html:
                '<div class="mb-3 text-left"><label class="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>' +
                '<input id="swal-input1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: Webinar, Workshop"></div>' +
                '<div class="text-left"><label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>' +
                '<textarea id="swal-input2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deskripsi singkat kategori"></textarea></div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            preConfirm: () => {
                return [
                    document.getElementById('swal-input1').value,
                    document.getElementById('swal-input2').value
                ]
            }
        });

        if (formValues) {
            const [name, description] = formValues;
            if (!name) {
                Swal.fire('Error', 'Nama kategori wajib diisi', 'error');
                return;
            }

            try {
                setLoading(true);
                // Ensure route exists, otherwise fallback or error
                const url = window.route ? window.route('kategori.store') : '/kategori'; 
                
                const response = await axios.post(url, {
                    name,
                    description
                }, {
                    headers: { 'Accept': 'application/json' }
                });

                if (response.data.success) {
                    const newCategory = response.data.category;
                    const newCategories = [...categories, newCategory];
                    setCategories(newCategories);
                    onChange(newCategory.id); // Auto select new category
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Kategori berhasil ditambahkan',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Gagal menambahkan kategori', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;

        const category = categories.find(c => c.id == selectedId);
        if (!category) return;

        const result = await Swal.fire({
            title: 'Hapus Kategori?',
            text: `Anda yakin ingin menghapus kategori "${category.name}"? Data yang menggunakan kategori ini mungkin akan terpengaruh.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                setLoading(true);
                const url = window.route ? window.route('kategori.destroy', category.id) : `/kategori/${category.id}`;

                const response = await axios.delete(url, {
                    headers: { 'Accept': 'application/json' }
                });

                if (response.data.success) {
                    const newCategories = categories.filter(c => c.id != selectedId);
                    setCategories(newCategories);
                    onChange(''); // Clear selection
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Terhapus!',
                        text: 'Kategori berhasil dihapus.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            } catch (error) {
                console.error(error);
                const message = error.response?.data?.message || 'Gagal menghapus kategori';
                Swal.fire('Gagal', message, 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex items-start gap-2">
            <div className="flex-grow">
                <select
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
                    value={selectedId}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={loading}
                >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>
            
            <button
                type="button"
                onClick={handleAdd}
                disabled={loading}
                className="px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="Tambah Kategori Baru"
            >
                <i className="fas fa-plus"></i>
            </button>

            {selectedId && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    title="Hapus Kategori Terpilih"
                >
                    <i className="fas fa-trash"></i>
                </button>
            )}
        </div>
    );
}
