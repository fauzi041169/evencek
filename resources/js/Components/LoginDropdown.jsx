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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-4 px-4 ring-1 ring-black ring-opacity-5 z-50">
                    
                    {/* Google Login Button - Visible in both modes */}
                    <div className="mb-4">
                        <a 
                            href={route('auth.google.login')} 
                            className="flex items-center justify-center w-full py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all text-gray-700 font-medium text-sm"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" onError={(e) => {e.target.style.display='none'}} />
                            {mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
                        </a>
                    </div>

                    <div className="relative flex py-2 items-center mb-4">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">ATAU</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {mode === 'login' ? (
                        <form onSubmit={submitLogin}>
                            <div className="mb-4">
                                <label htmlFor="login_email" className="block mb-1 text-gray-700 font-medium text-sm">Email</label>
                                <input 
                                    type="email" 
                                    id="login_email" 
                                    value={loginData.login}
                                    onChange={(e) => setLoginData('login', e.target.value)}
                                    required 
                                    placeholder="Email Anda"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                {errorsLogin.login && (
                                    <div className="text-red-600 text-xs mt-1">
                                        {errorsLogin.login}
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="login_password" className="block mb-1 text-gray-700 font-medium text-sm">Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        id="login_password" 
                                        value={loginData.password}
                                        onChange={(e) => setLoginData('password', e.target.value)}
                                        required 
                                        placeholder="Password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-primary focus:outline-none"
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
                                {errorsLogin.password && (
                                    <div className="text-red-600 text-xs mt-1">
                                        {errorsLogin.password}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center text-sm text-gray-600">
                                    <input 
                                        type="checkbox" 
                                        checked={loginData.remember}
                                        onChange={(e) => setLoginData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary mr-2"
                                    />
                                    Ingat Saya
                                </label>
                                <Link href="/auth/forgot-password" className="text-sm text-primary hover:text-primary/80">
                                    Lupa Password?
                                </Link>
                            </div>

                            <button 
                                type="submit" 
                                disabled={processingLogin}
                                className="w-full py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold shadow-md hover:from-primary hover:to-secondary transition-all disabled:opacity-70"
                            >
                                {processingLogin ? 'Memproses...' : 'Masuk'}
                            </button>

                            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                                <p className="text-sm text-gray-600">
                                    Belum punya akun?{' '}
                                    <button 
                                        type="button"
                                        onClick={() => setMode('register')}
                                        className="text-primary font-medium hover:text-primary/80 focus:outline-none"
                                    >
                                        Daftar
                                    </button>
                                </p>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitRegister}>
                            <div className="mb-3">
                                <label htmlFor="reg_name" className="block mb-1 text-gray-700 font-medium text-sm">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    id="reg_name" 
                                    value={registerData.name}
                                    onChange={(e) => setRegisterData('name', e.target.value)}
                                    required 
                                    placeholder="Nama Lengkap"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                {errorsRegister.name && (
                                    <div className="text-red-600 text-xs mt-1">
                                        {errorsRegister.name}
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="reg_email" className="block mb-1 text-gray-700 font-medium text-sm">Email</label>
                                <input 
                                    type="email" 
                                    id="reg_email" 
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData('email', e.target.value)}
                                    required 
                                    placeholder="Email Anda"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                {errorsRegister.email && (
                                    <div className="text-red-600 text-xs mt-1">
                                        {errorsRegister.email}
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="reg_password" className="block mb-1 text-gray-700 font-medium text-sm">Password</label>
                                <div className="relative">
                                    <input 
                                        type={showRegisterPassword ? "text" : "password"} 
                                        id="reg_password" 
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData('password', e.target.value)}
                                        required 
                                        placeholder="Password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-indigo-600 focus:outline-none"
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
                                {errorsRegister.password && (
                                    <div className="text-red-600 text-xs mt-1">
                                        {errorsRegister.password}
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="reg_password_confirmation" className="block mb-1 text-gray-700 font-medium text-sm">Konfirmasi Password</label>
                                <div className="relative">
                                    <input 
                                        type={showRegisterConfirmPassword ? "text" : "password"} 
                                        id="reg_password_confirmation" 
                                        value={registerData.password_confirmation}
                                        onChange={(e) => setRegisterData('password_confirmation', e.target.value)}
                                        required 
                                        placeholder="Ulangi Password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-indigo-600 focus:outline-none"
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

                            <button 
                                type="submit" 
                                disabled={processingRegister}
                                className="w-full py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold shadow-md hover:from-primary hover:to-secondary transition-all disabled:opacity-70"
                            >
                                {processingRegister ? 'Mendaftar...' : 'Daftar Sekarang'}
                            </button>

                            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                                <p className="text-sm text-gray-600">
                                    Sudah punya akun?{' '}
                                    <button 
                                        type="button"
                                        onClick={() => setMode('login')}
                                        className="text-indigo-600 font-medium hover:text-indigo-800 focus:outline-none"
                                    >
                                        Masuk
                                    </button>
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
