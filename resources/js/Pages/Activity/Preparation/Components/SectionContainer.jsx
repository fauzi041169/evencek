import React from 'react';
import { router } from '@inertiajs/react';

export default function SectionContainer({ title, children, activity, controls = [] }) {
    const toggleField = (field, currentValue) => {
        router.post(route('activity.preparation.update-settings', activity.id), {
            [field]: !currentValue,
            _method: 'PUT'
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Optional toast
            }
        });
    };

    return (
        <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg mb-6 border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                
                <div className="flex items-center gap-4">
                    {controls.map((control) => (
                        <div key={control.field} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">{control.label}:</span>
                            <button
                                onClick={() => toggleField(control.field, control.value)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                                    control.value ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                                role="switch"
                                aria-checked={control.value}
                                title={`Toggle ${control.label}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        control.value ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-0">
                {children}
            </div>
        </div>
    );
}
