import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import { ArrowLeft, Save, Trash2, Plus, Image as ImageIcon, X } from 'lucide-react';

export default function Create({ activity, initialType = 'other' }) {
    const [votingType, setVotingType] = useState('multiple_choice');

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        type: initialType,
        description: '',
        start_time: '',
        end_time: '',
        is_active: true,
        image: null,
        questions: []
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        post(route('activity.event-activities.store', activity.id), {
            forceFormData: true,
        });
    };

    const addQuestion = () => {
        const newQuestion = {
            text: '',
            type: data.type === 'voting' ? votingType : 'multiple_choice',
            is_required: false,
            options: '',
            candidates: []
        };

        // If voting, add at least 2 candidates by default
        if (data.type === 'voting') {
            newQuestion.candidates = [
                { name: '', description: '', image: null },
                { name: '', description: '', image: null }
            ];
        }

        setData('questions', [...data.questions, newQuestion]);
    };

    const removeQuestion = (index) => {
        const newQuestions = [...data.questions];
        newQuestions.splice(index, 1);
        setData('questions', newQuestions);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...data.questions];
        newQuestions[index][field] = value;
        setData('questions', newQuestions);
    };

    // Candidate management for voting
    const addCandidate = (qIndex) => {
        const newQuestions = [...data.questions];
        newQuestions[qIndex].candidates.push({ name: '', description: '', image: null });
        setData('questions', newQuestions);
    };

    const removeCandidate = (qIndex, cIndex) => {
        const newQuestions = [...data.questions];
        newQuestions[qIndex].candidates.splice(cIndex, 1);
        setData('questions', newQuestions);
    };

    const updateCandidate = (qIndex, cIndex, field, value) => {
        const newQuestions = [...data.questions];
        newQuestions[qIndex].candidates[cIndex][field] = value;
        setData('questions', newQuestions);
    };

    const handleVotingTypeChange = (newType) => {
        setVotingType(newType);
        // Update all existing questions to this type if currently voting
        if (data.type === 'voting') {
            const newQuestions = data.questions.map(q => ({ ...q, type: newType }));
            setData('questions', newQuestions);
        }
    };

    // Initialize with one question/voting item if empty
    React.useEffect(() => {
        if (data.questions.length === 0) {
            addQuestion();
        }
    }, []);

    return (
        <AcaraLayout activity={activity} title={`Buat Kegiatan Baru - ${activity.name}`}>

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 px-4 sm:px-0">
                        <Link 
                            href={route('activity.event-activities.index', activity.id)}
                            className="text-sm text-primary hover:text-indigo-900 flex items-center mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Kembali ke Daftar Kegiatan
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-800">Buat Kegiatan Baru</h1>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <form onSubmit={handleSubmit} encType="multipart/form-data">
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Basic Info */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Judul Kegiatan</label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={e => setData('title', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                            placeholder="Contoh: Pemilihan Ketua Angkatan"
                                        />
                                        {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tipe Kegiatan</label>
                                        <select
                                            value={data.type}
                                            onChange={e => setData('type', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="voting">Voting / Polling</option>
                                            <option value="quiz">Kuis / Ujian</option>
                                            <option value="assignment">Tugas</option>
                                            <option value="other">Lainnya</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                                        <textarea
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            rows="3"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            placeholder="Jelaskan detail kegiatan ini..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Waktu Mulai</label>
                                            <input
                                                type="datetime-local"
                                                value={data.start_time}
                                                onChange={e => setData('start_time', e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Waktu Selesai</label>
                                            <input
                                                type="datetime-local"
                                                value={data.end_time}
                                                onChange={e => setData('end_time', e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Gambar Cover (Opsional)</label>
                                        <input
                                            type="file"
                                            onChange={e => setData('image', e.target.files[0])}
                                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-primary/10"
                                            accept="image/*"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={data.is_active}
                                            onChange={e => setData('is_active', e.target.checked)}
                                            className="h-4 w-4 text-primary focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                            Aktifkan Kegiatan Ini
                                        </label>
                                    </div>

                                    {/* Voting Specific Options */}
                                    {data.type === 'voting' && (
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                            <label className="block text-sm font-medium text-purple-900 mb-1">Mode Pilihan Voting</label>
                                            <select
                                                value={votingType}
                                                onChange={e => handleVotingTypeChange(e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="multiple_choice">Pilih Satu (Single Choice)</option>
                                                <option value="checkbox">Pilih Banyak (Multiple Choice)</option>
                                            </select>
                                            <p className="text-xs text-purple-700 mt-1">Tentukan apakah peserta hanya boleh memilih satu kandidat atau lebih.</p>
                                        </div>
                                    )}

                                    {/* Questions / Items Section */}
                                    <div className="border-t pt-6 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {data.type === 'voting' ? 'Item Voting' : 'Pertanyaan / Item'}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={addQuestion}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-indigo-700 focus:outline-none"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Tambah {data.type === 'voting' ? 'Sesi Voting' : 'Pertanyaan'}
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {data.questions.map((question, qIndex) => (
                                                <div key={qIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIndex)}
                                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>

                                                    {data.type === 'voting' ? (
                                                        // Voting Layout
                                                        <div>
                                                            <div className="mb-4 pr-8">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Judul / Pertanyaan Voting</label>
                                                                <input
                                                                    type="text"
                                                                    value={question.text}
                                                                    onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                                                                    placeholder="Contoh: Siapakah calon ketua pilihanmu?"
                                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                                                                <label className="block text-sm font-medium text-gray-700">Kandidat / Pilihan</label>
                                                                {question.candidates.map((candidate, cIndex) => (
                                                                    <div key={cIndex} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="text-xs font-semibold text-gray-500 uppercase">Kandidat {cIndex + 1}</span>
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => removeCandidate(qIndex, cIndex)}
                                                                                className="text-red-500 hover:text-red-700 text-xs flex items-center"
                                                                            >
                                                                                <X className="w-3 h-3 mr-1" /> Hapus
                                                                            </button>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                            <div className="md:col-span-2 space-y-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={candidate.name}
                                                                                    onChange={e => updateCandidate(qIndex, cIndex, 'name', e.target.value)}
                                                                                    placeholder="Nama Kandidat / Pilihan"
                                                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                                    required
                                                                                />
                                                                                <textarea
                                                                                    value={candidate.description || ''}
                                                                                    onChange={e => updateCandidate(qIndex, cIndex, 'description', e.target.value)}
                                                                                    placeholder="Deskripsi (Visi Misi dll)"
                                                                                    rows="2"
                                                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 relative overflow-hidden">
                                                                                    {candidate.image ? (
                                                                                        <img 
                                                                                            src={URL.createObjectURL(candidate.image)} 
                                                                                            className="absolute inset-0 w-full h-full object-cover" 
                                                                                            alt="Preview" 
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                                            <ImageIcon className="w-8 h-8 text-gray-400" />
                                                                                            <p className="text-xs text-gray-500">Upload Foto</p>
                                                                                        </div>
                                                                                    )}
                                                                                    <input 
                                                                                        type="file" 
                                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                                        accept="image/*"
                                                                                        onChange={e => updateCandidate(qIndex, cIndex, 'image', e.target.files[0])}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addCandidate(qIndex)}
                                                                    className="text-sm text-primary hover:text-primary font-medium flex items-center"
                                                                >
                                                                    <Plus className="w-4 h-4 mr-1" /> Tambah Kandidat
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Standard Question Layout
                                                        <div>
                                                            <div className="mb-3 pr-8">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
                                                                <input
                                                                    type="text"
                                                                    value={question.text}
                                                                    onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Jawaban</label>
                                                                    <select
                                                                        value={question.type}
                                                                        onChange={e => updateQuestion(qIndex, 'type', e.target.value)}
                                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    >
                                                                        <option value="multiple_choice">Pilihan Ganda</option>
                                                                        <option value="essay">Isian Singkat / Esai</option>
                                                                        <option value="scale">Skala (1-5)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center pt-6">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={question.is_required}
                                                                        onChange={e => updateQuestion(qIndex, 'is_required', e.target.checked)}
                                                                        className="h-4 w-4 text-primary focus:ring-indigo-500 border-gray-300 rounded"
                                                                    />
                                                                    <label className="ml-2 block text-sm text-gray-900">
                                                                        Wajib Diisi
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            {question.type === 'multiple_choice' && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Opsi Jawaban</label>
                                                                    <input
                                                                        type="text"
                                                                        value={question.options}
                                                                        onChange={e => updateQuestion(qIndex, 'options', e.target.value)}
                                                                        placeholder="Contoh: Ya, Tidak, Mungkin (pisahkan dengan koma)"
                                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                    />
                                                                    <p className="text-xs text-gray-500 mt-1">Pisahkan setiap opsi dengan tanda koma.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {data.questions.length === 0 && (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                <p className="text-gray-500">Belum ada pertanyaan atau item.</p>
                                                <button
                                                    type="button"
                                                    onClick={addQuestion}
                                                    className="mt-2 text-primary hover:text-primary font-medium"
                                                >
                                                    Mulai Tambahkan
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {processing ? 'Menyimpan...' : 'Simpan Kegiatan'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AcaraLayout>
    );
}

