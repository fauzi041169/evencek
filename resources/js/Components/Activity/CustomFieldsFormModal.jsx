import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';

export default function CustomFieldsFormModal({
    isOpen,
    onClose,
    customFields,
    onSubmit,
    title = 'Data Tambahan Diperlukan',
    description = 'Mohon lengkapi data berikut untuk melanjutkan pendaftaran.'
}) {
    const [formData, setFormData] = useState({});
    const [fileData, setFileData] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({});
            setFileData({});
            setErrors({});
        }
    }, [isOpen]);

    const handleChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));

        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const handleFileChange = (key, file) => {
        setFileData(prev => ({
            ...prev,
            [key]: file || null
        }));

        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        let hasError = false;

        customFields.forEach(field => {
            const key = field.key;
            const type = field.type || 'text';

            let value = formData[key];
            if (type === 'file') {
                value = fileData[key];
            }

            if (field.is_required) {
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    newErrors[key] = `${field.label} wajib diisi.`;
                    hasError = true;
                }
            }
        });

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        const payload = { ...formData };
        Object.entries(fileData).forEach(([key, file]) => {
            if (file) {
                payload[key] = file;
            }
        });

        onSubmit(payload);
    };

    if (!customFields || customFields.length === 0) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100200]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    {title}
                                </Dialog.Title>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {description}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                    {customFields.map((field) => (
                                        <div key={field.key}>
                                            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                                                {field.label} {field.is_required && <span className="text-red-500">*</span>}
                                            </label>

                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    id={field.key}
                                                    rows={3}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    required={field.is_required}
                                                />
                                            ) : field.type === 'dropdown' ? (
                                                <select
                                                    id={field.key}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    required={field.is_required}
                                                >
                                                    <option value="">Pilih {field.label}</option>
                                                    {field.options && field.options.split(',').map((opt, idx) => {
                                                        const cleanOpt = opt.trim();
                                                        return (
                                                            <option key={idx} value={cleanOpt}>{cleanOpt}</option>
                                                        );
                                                    })}
                                                </select>
                                            ) : field.type === 'file' ? (
                                                <input
                                                    type="file"
                                                    id={field.key}
                                                    onChange={(e) => handleFileChange(field.key, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    required={field.is_required}
                                                />
                                            ) : (
                                                <input
                                                    type={field.type || 'text'}
                                                    id={field.key}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    required={field.is_required}
                                                />
                                            )}

                                            {errors[field.key] && (
                                                <p className="mt-1 text-xs text-red-500">{errors[field.key]}</p>
                                            )}
                                        </div>
                                    ))}

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        >
                                            Simpan & Lanjutkan
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
