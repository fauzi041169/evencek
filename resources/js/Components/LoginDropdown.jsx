import React, { useState, useRef, useEffect } from 'react';
import { useForm, Link } from '@inertiajs/react';

export default function LoginDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [showPassword, setShowPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
    const dropdownRef = useRef(null);

    // Login Form
    const { data: loginData, setData: setLoginData, post: postLogin, processing: processingLogin, errors: errorsLogin, reset: resetLogin } = useForm({
        login: '',
        password: '',
        remember: false,
    });

    // Register Form
    const { data: registerData, setData: setRegisterData, post: postRegister, processing: processingRegister, errors: errorsRegister, reset: resetRegister } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        // Expose toggle function to window for global access
        window.toggleLoginDropdown = () => setIsOpen(prev => !prev);
        window.openLoginModal = () => setIsOpen(true);

        // Check for login=true in URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('login') === 'true') {
            setIsOpen(true);
        }
        
        // Check for global flag
        if (window.loginModalForceOpen) {
            setIsOpen(true);
        }

        return () => {
            delete window.toggleLoginDropdown;
            delete window.openLoginModal;
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    useEffect(() => {
        if (!isOpen) {
            // Reset mode to login when closed
            setMode('login');
        }
    }, [isOpen]);

    const submitLogin = (e) => {
        e.preventDefault();
        postLogin(route('login.submit'), {
            onFinish: () => resetLogin('password'),
        });
    };

    const submitRegister = (e) => {
        e.preventDefault();
        postRegister(route('auth.register.store'), {
            onFinish: () => resetRegister('password', 'password_confirmation'),
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center focus:outline-none transition-transform hover:scale-105"
            >
                <img 
                    src="/assets/images/icon/login.png" 
                    alt="Login" 
                    className="h-10 w-auto"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl p-6 ring-1 ring-black ring-opacity-5 z-50 transform origin-top-right transition-all duration-200 ease-out">
                    
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">
                            {mode === 'login' ? 'Selamat Datang Kembali!' : 'Buat Akun Baru'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {mode === 'login' ? 'Masuk untuk mengakses akun Anda' : 'Daftar untuk mulai menjelajah'}
                        </p>
                    </div>

                    {/* Google Login Button */}
                    <div className="mb-5">
                        <a 
                            href={route('auth.google.login')} 
                            className="flex items-center justify-center w-full py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] transition-all duration-200 text-gray-700 font-medium text-sm group"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" alt="Google" onError={(e) => {e.target.style.display='none'}} />
                            {mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
                        </a>
                    </div>

                    <div className="relative flex py-2 items-center mb-5">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">ATAU</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {mode === 'login' ? (
                        <form onSubmit={submitLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Email</label>
                                <input
                                    type="text"
                                    value={loginData.login}
                                    onChange={(e) => setLoginData('login', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm"
                                    placeholder="nama@email.com"
                                    required
                                />
                                {errorsLogin.login && <div className="text-red-500 text-xs mt-1 ml-1">{errorsLogin.login}</div>}
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1 ml-1">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={loginData.password}
                                        onChange={(e) => setLoginData('password', e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errorsLogin.password && <div className="text-red-500 text-xs mt-1 ml-1">{errorsLogin.password}</div>}
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={loginData.remember}
                                        onChange={(e) => setLoginData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 mr-2"
                                    />
                                    Ingat Saya
                                </label>
                                <Link href="/auth/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                    Lupa Password?
                                </Link>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processingLogin}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {processingLogin ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Memproses...
                                        </>
                                    ) : 'Masuk Sekarang'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={registerData.name}
                                    onChange={(e) => setRegisterData('name', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm"
                                    placeholder="Nama Anda"
                                    required
                                />
                                {errorsRegister.name && <div className="text-red-500 text-xs mt-1 ml-1">{errorsRegister.name}</div>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData('email', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm"
                                    placeholder="nama@email.com"
                                    required
                                />
                                {errorsRegister.email && <div className="text-red-500 text-xs mt-1 ml-1">{errorsRegister.email}</div>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showRegisterPassword ? "text" : "password"}
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData('password', e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm pr-10"
                                        placeholder="Minimal 8 karakter"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                    >
                                        {showRegisterPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {registerErrors.password && <div className="text-red-500 text-xs mt-1 ml-1">{registerErrors.password}</div>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Konfirmasi Password</label>
                                <div className="relative">
                                    <input
                                        type={showRegisterConfirmPassword ? "text" : "password"}
                                        value={registerData.password_confirmation}
                                        onChange={(e) => setRegisterData('password_confirmation', e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none text-sm pr-10"
                                        placeholder="Ulangi password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                                    >
                                        {showRegisterConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processingRegister}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {processingRegister ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mendaftar...
                                        </>
                                    ) : 'Daftar Sekarang'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Switch Mode */}
                    <div className="mt-6 text-center border-t border-gray-100 pt-4">
                        <p className="text-sm text-gray-600">
                            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="ml-1 text-blue-600 font-semibold hover:text-blue-800 hover:underline focus:outline-none transition-colors"
                            >
                                {mode === 'login' ? 'Daftar disini' : 'Masuk disini'}
                            </button>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
