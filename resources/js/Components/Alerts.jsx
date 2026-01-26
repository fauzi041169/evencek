import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Alerts({ flash: propFlash, errors: propErrors }) {
    const { flash: pageFlash, errors: pageErrors } = usePage().props;
    const flash = propFlash || pageFlash || {};
    const errors = propErrors || pageErrors || {};

    const [visibleAlerts, setVisibleAlerts] = useState({
        success: true,
        error: true,
        info: true,
        warning: true,
        errors: true
    });

    useEffect(() => {
        // Reset visibility when flash messages change
        setVisibleAlerts({
            success: true,
            error: true,
            info: true,
            warning: true,
            errors: true
        });

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            setVisibleAlerts({
                success: false,
                error: false,
                info: false,
                warning: false,
                errors: false
            });
        }, 5000);

        return () => clearTimeout(timer);
    }, [flash]);

    const dismissAlert = (type) => {
        setVisibleAlerts(prev => ({ ...prev, [type]: false }));
    };

    // Filter out errors that are displayed inline in forms
    const ignoredErrorKeys = ['login', 'email', 'password', 'name', 'password_confirmation', 'current_password'];
    const errorList = Object.entries(errors)
        .filter(([key]) => !ignoredErrorKeys.includes(key))
        .map(([, value]) => value)
        .flat()
        .filter(Boolean);

    const Toast = ({ type, title, message, icon, colorClass, borderClass, bgClass, containerClass }) => (
        <div className={`mb-4 w-full ${containerClass} border-l-4 ${borderClass} rounded-r-xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] flex items-start p-4 relative overflow-hidden`}>
            {/* Background decoration */}
            <div className={`absolute -right-6 -top-6 w-16 h-16 rounded-full ${bgClass} opacity-20`}></div>

            <div className="flex-shrink-0 mr-4">
                {icon}
            </div>
            <div className="flex-1 mr-8">
                <h4 className={`font-bold text-sm ${colorClass} mb-1`}>{title}</h4>
                <p className={`text-sm ${type === 'error' ? 'text-red-700' : (type === 'success' ? 'text-green-700' : (type === 'warning' ? 'text-yellow-800' : 'text-blue-700'))} leading-relaxed`}>{message}</p>
            </div>
            <button
                onClick={() => dismissAlert(type)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );

    return (
        <div className="fixed top-24 right-5 z-[9999] flex flex-col items-end space-y-4 min-w-[320px] max-w-sm pointer-events-none">
            <div className="pointer-events-auto w-full">
                {/* Success Alert */}
                {flash.success && visibleAlerts.success && (
                    <Toast
                        type="success"
                        title="Berhasil!"
                        message={flash.success}
                        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                        colorClass="text-green-800"
                        borderClass="border-green-500"
                        bgClass="bg-green-500"
                        containerClass="bg-green-50"
                    />
                )}

                {/* Error Alert */}
                {flash.error && visibleAlerts.error && (
                    <Toast
                        type="error"
                        title="Terjadi Kesalahan!"
                        message={flash.error}
                        icon={<AlertCircle className="w-6 h-6 text-red-600" />}
                        colorClass="text-red-800"
                        borderClass="border-red-500"
                        bgClass="bg-red-500"
                        containerClass="bg-red-50"
                    />
                )}

                {/* Info Alert */}
                {flash.info && visibleAlerts.info && (
                    <Toast
                        type="info"
                        title="Informasi"
                        message={flash.info}
                        icon={<Info className="w-6 h-6 text-blue-600" />}
                        colorClass="text-blue-800"
                        borderClass="border-blue-500"
                        bgClass="bg-blue-500"
                        containerClass="bg-blue-50"
                    />
                )}

                {/* Warning Alert */}
                {flash.warning && visibleAlerts.warning && (
                    <Toast
                        type="warning"
                        title="Peringatan"
                        message={flash.warning}
                        icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />}
                        colorClass="text-yellow-800"
                        borderClass="border-yellow-500"
                        bgClass="bg-yellow-500"
                        containerClass="bg-yellow-50"
                    />
                )}

                {/* Validation Errors */}
                {errorList.length > 0 && visibleAlerts.errors && (
                    <Toast
                        type="errors"
                        title="Validasi Gagal"
                        message={
                            <ul className="list-disc list-inside space-y-1">
                                {errorList.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        }
                        icon={<AlertCircle className="w-6 h-6 text-red-600" />}
                        colorClass="text-red-800"
                        borderClass="border-red-500"
                        bgClass="bg-red-500"
                        containerClass="bg-red-50"
                    />
                )}
            </div>
        </div>
    );
}
