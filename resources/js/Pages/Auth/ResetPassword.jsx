import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.update'));
    };

    return (
        <div className="min-h-screen flex justify-center items-center p-5 bg-gradient-to-br from-slate-900 to-indigo-900 font-sans">
            <Head title="Reset Password - IVEN-HUB" />

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-10 w-full max-w-[420px] shadow-2xl">
                <div className="text-center mb-8">
                    <img
                        src="/assets/images/logo.png"
                        alt="IVEN-HUB Logo"
                        className="w-[120px] h-auto mx-auto mb-4"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                        }}
                    />
                </div>

                <h1 className="text-[#333] text-2xl font-bold text-center mb-5">Reset Password</h1>

                <form onSubmit={submit}>
                    <input type="hidden" name="token" value={data.token} />

                    <div className="mb-6">
                        <label htmlFor="email" className="block mb-2 text-[#333] font-medium text-sm">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            readOnly
                            className="w-full px-4 py-3 border-2 border-[#e1e1e1] rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-gray-50 cursor-not-allowed"
                        />
                        {errors.email && (
                            <div className="text-red-500 text-sm mt-1">{errors.email}</div>
                        )}
                    </div>

                    <div className="mb-6 relative">
                        <label htmlFor="password" className="block mb-2 text-[#333] font-medium text-sm">Password Baru</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                className="w-full px-4 py-3 border-2 border-[#e1e1e1] rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 focus:outline-none"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </button>
                        </div>
                        {errors.password && (
                            <div className="text-red-500 text-sm mt-1">{errors.password}</div>
                        )}
                    </div>

                    <div className="mb-6 relative">
                        <label htmlFor="password_confirmation" className="block mb-2 text-[#333] font-medium text-sm">Konfirmasi Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                                className="w-full px-4 py-3 border-2 border-[#e1e1e1] rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 focus:outline-none"
                            >
                                <i className={`fas ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-700 border-none rounded-xl text-white text-base font-bold cursor-pointer transition-all duration-300 hover:from-indigo-500 hover:to-blue-600 hover:-translate-y-0.5 hover:shadow-lg shadow-indigo-200 disabled:opacity-70 active:scale-[0.98]"
                    >
                        {processing ? 'Memproses...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
