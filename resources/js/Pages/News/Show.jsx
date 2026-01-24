import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function Show({ news, averageRating, ratingCounts, totalRatings, userRating }) {
    const { auth } = usePage().props;
    const [rating, setRating] = useState(userRating || 0);
    const [hoverRating, setHoverRating] = useState(0);

    // Comment Form
    const { data, setData, post, processing, reset, errors } = useForm({
        content: '',
        parent_id: null,
        rating: null,
    });

    const handleRating = (value) => {
        if (!auth.user) {
            Swal.fire('Info', 'Silakan login untuk memberikan rating', 'info');
            return;
        }
        setRating(value);
        setData('rating', value);
        // Instant rating submission could be implemented here if desired
    };

    const submitComment = (e) => {
        e.preventDefault();
        post(route('news.comments.store', news.slug), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                Swal.fire('Berhasil', 'Komentar berhasil dikirim', 'success');
            },
        });
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: id });
    };

    const getImageUrl = (image) => {
        if (!image) return '/assets/images/news/default-news.jpg';
        if (image.startsWith('http')) return image;
        return `/storage/${image}`;
    };

    return (
        <WebLayout>
            <Head title={news.title} />

            <div className="py-12 pt-24 min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <nav className="flex text-sm text-gray-500 mb-6">
                        <Link href={route('home')} className="hover:text-secondary">Beranda</Link>
                        <span className="mx-2">/</span>
                        <Link href={route('news.index')} className="hover:text-secondary">Berita</Link>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 truncate max-w-xs">{news.title}</span>
                    </nav>

                    {/* Main Content */}
                    <article className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                        {/* Featured Image */}
                        <div className="relative h-64 md:h-96 w-full">
                            <img 
                                src={getImageUrl(news.image)} 
                                alt={news.title} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/images/news/default-news.jpg';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
                                <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                                    {news.category?.name || 'Umum'}
                                </span>
                                <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-2 text-shadow">
                                    {news.title}
                                </h1>
                                <div className="flex items-center text-sm md:text-base text-gray-200">
                                    <div className="flex items-center mr-6">
                                        <img 
                                            src={news.author?.profile_photo_url || '/assets/images/profilefoto/default-profile.png'} 
                                            alt={news.author?.name}
                                            className="w-8 h-8 rounded-full mr-2 border border-white"
                                        />
                                        <span>{news.author?.name || 'Admin'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <i className="far fa-calendar-alt mr-2"></i>
                                        {formatDate(news.published_at || news.created_at)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Article Body */}
                        <div className="p-6 md:p-10">
                            <div 
                                className="prose prose-lg max-w-none prose-blue text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: news.content }} 
                            />
                            
                            {/* Tags / Meta Footer */}
                            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
                                <div className="flex items-center space-x-4">
                                    <span className="text-gray-500 text-sm flex items-center">
                                        <i className="far fa-eye mr-2"></i> {news.views_count} Views
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    {/* Social Share Buttons could go here */}
                                    <button className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-blue-200 transition">
                                        <i className="fab fa-facebook-f"></i>
                                    </button>
                                    <button className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition">
                                        <i className="fab fa-whatsapp"></i>
                                    </button>
                                    <button className="p-2 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition">
                                        <i className="fab fa-twitter"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>

                    {/* Ratings & Comments Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            <i className="far fa-comments mr-3 text-secondary"></i>
                            Diskusi & Ulasan
                        </h3>

                        {/* Rating Summary */}
                        <div className="flex flex-col md:flex-row items-center mb-8 bg-gray-50 rounded-xl p-6">
                            <div className="text-center md:text-left md:mr-10 mb-4 md:mb-0">
                                <div className="text-5xl font-bold text-gray-900 mb-1">{parseFloat(averageRating).toFixed(1)}</div>
                                <div className="flex justify-center md:justify-start text-yellow-400 text-lg mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <i key={star} className={`${star <= Math.round(averageRating) ? 'fas' : 'far'} fa-star`}></i>
                                    ))}
                                </div>
                                <div className="text-gray-500 text-sm">{totalRatings} Ulasan</div>
                            </div>
                            
                            {/* Rating Bars - Simplified */}
                            <div className="flex-1 w-full">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = ratingCounts[star] || 0;
                                    const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center mb-1">
                                            <span className="w-4 text-sm text-gray-600 mr-2">{star}</span>
                                            <i className="fas fa-star text-yellow-400 text-xs mr-2"></i>
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-yellow-400 h-2 rounded-full" 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="w-8 text-right text-xs text-gray-500 ml-2">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Comment Form */}
                        {auth.user ? (
                            <form onSubmit={submitComment} className="mb-10">
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Berikan Rating</label>
                                    <div className="flex space-x-2 text-2xl text-gray-300 cursor-pointer">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <i 
                                                key={star}
                                                className={`${(hoverRating || rating) >= star ? 'fas text-yellow-400' : 'fas'} fa-star hover:text-yellow-400 transition-colors`}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => handleRating(star)}
                                            ></i>
                                        ))}
                                    </div>
                                    {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Komentar Anda</label>
                                    <textarea
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        rows="4"
                                        placeholder="Tulis pendapat Anda tentang berita ini..."
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                    ></textarea>
                                    {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-secondary text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                        {processing ? 'Mengirim...' : 'Kirim Komentar'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center mb-10">
                                <p className="text-gray-700 mb-4">Silakan masuk untuk memberikan rating dan komentar.</p>
                                <div className="flex justify-center space-x-4">
                                    <Link href="/login" className="bg-secondary text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Masuk</Link>
                                    <Link href="/register" className="bg-white text-secondary border border-secondary px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition">Daftar</Link>
                                </div>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="space-y-6">
                            {news.comments && news.comments.length > 0 ? (
                                news.comments.map((comment) => (
                                    <div key={comment.id} className="flex space-x-4 border-b border-gray-100 pb-6 last:border-0">
                                        <img 
                                            src={comment.user?.profile_photo_url || '/assets/images/profilefoto/default-profile.png'} 
                                            alt={comment.user?.name} 
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-gray-900">{comment.user?.name}</h4>
                                                <span className="text-xs text-gray-500">{moment(comment.created_at).fromNow()}</span>
                                            </div>
                                            {comment.rating && (
                                                <div className="text-yellow-400 text-xs mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <i key={i} className={`${i < comment.rating ? 'fas' : 'far'} fa-star`}></i>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </WebLayout>
    );
}

