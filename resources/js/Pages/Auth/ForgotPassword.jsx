import { Head, useForm, Link } from '@inertiajs/react';

export default function ForgotPassword({ status, hp_time }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        hp_field: '',
        hp_time: hp_time || Math.floor(Date.now() / 1000),
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="min-h-screen flex justify-center items-center p-5 bg-gradient-to-br from-primary to-secondary font-sans">
            <Head title="Lupa Password - IVEN-HUB" />
            
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-10 w-full max-w-[420px] shadow-2xl">
                <div className="text-center mb-8">
                     <img 
                        src="/assets/images/logo.png" 
                        alt="IVEN-HUB Logo" 
                        className="w-[120px] h-auto mx-auto mb-4"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="hidden w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                        <i className="fas fa-shield-alt text-3xl text-gray-400"></i>
                    </div>
                </div>

                <h1 className="text-[#333] text-2xl font-bold text-center mb-5">Lupa Password</h1>
                <p className="text-[#333] text-center mb-6 text-sm leading-relaxed">
                    Masukkan email Anda. Kami akan mengirimkan link untuk reset password ke email Anda.
                </p>

                {status && (
                    <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2">
                        <i className="fas fa-check-circle"></i>
                        {status}
                    </div>
                )}

                <form onSubmit={submit}>
                    {/* Honeypot fields */}
                    <input 
                        type="text" 
                        name="hp_field" 
                        autoComplete="off" 
                        tabIndex="-1" 
                        aria-hidden="true" 
                        className="absolute left-[-9999px] top-[-9999px] w-px h-px opacity-0"
                        value={data.hp_field}
                        onChange={(e) => setData('hp_field', e.target.value)}
                    />
                    <input type="hidden" name="hp_time" value={data.hp_time} />

                    <div className="mb-6">
                        <label htmlFor="email" className="block mb-2 text-[#333] font-medium text-sm">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required 
                            placeholder="contoh@email.com"
                            className="w-full px-4 py-3 border-2 border-[#e1e1e1] rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        {errors.email && (
                            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mt-2 text-sm flex items-center gap-2">
                                <i className="fas fa-exclamation-circle"></i>
                                {errors.email}
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full py-3.5 bg-gradient-to-br from-primary to-secondary border-none rounded-xl text-white text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70"
                    >
                        {processing ? 'Memproses...' : 'Kirim Link Reset Password'}
                    </button>
                </form>

                <div className="text-center mt-5">
                    <Link href={route('login')} className="text-primary no-underline text-sm font-medium hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
