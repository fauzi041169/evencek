import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function LoginModal({ isOpen, onClose, title = "Masuk ke Akun" }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false,
        redirect: window.location.href,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { // Assuming standard login route, or use 'auth.login.submit' if defined
            onFinish: () => reset('password'),
            onSuccess: () => {
                onClose();
                window.location.reload(); // Reload to reflect auth state
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] overflow-y-auto" aria-labelledby="login-modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center px-4 py-4 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                    aria-hidden="true" 
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="inline-block w-full max-w-[95vw] sm:max-w-md transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all sm:my-8 sm:align-middle relative z-[100000] max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y">
                    <div className="bg-indigo-600 px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white" id="login-modal-title">{title}</h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white focus:outline-none">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label htmlFor="login-modal-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fas fa-envelope text-gray-400"></i>
                                    </div>
                                    <input
                                        type="text"
                                        name="login"
                                        id="login-modal-email"
                                        required
                                        placeholder="nama@email.com"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        value={data.login}
                                        onChange={(e) => setData('login', e.target.value)}
                                    />
                                </div>
                                {errors.login && <div className="text-red-500 text-xs mt-1">{errors.login}</div>}
                                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="login-modal-password" class="block text-sm font-medium text-gray-700">Password</label>
                                    <a href={route('password.request')} className="text-xs text-indigo-600 hover:text-indigo-700">Lupa Password?</a>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fas fa-lock text-gray-400"></i>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        id="login-modal-password"
                                        required
                                        placeholder="••••••••"
                                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-indigo-600"
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                                    </button>
                                </div>
                                {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                            </div>

                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i> Memproses...
                                    </>
                                ) : (
                                    'Masuk'
                                )}
                            </button>
                        </form>

                        <div className="mt-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">atau</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <a 
                                    href={route('auth.google.login', { redirect: window.location.href })}
                                    className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-white border border-gray-300 shadow-sm hover:bg-gray-50 transition text-gray-700"
                                >
                                    <i className="fab fa-google text-red-500"></i>
                                    <span className="font-medium">Lanjutkan dengan Google</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
