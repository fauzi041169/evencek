import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function Show({ news, comments, averageRating, ratingCounts, totalRatings, userRating, relatedNews = [], latestNews = [] }) {
    const { auth } = usePage().props;
    const [rating, setRating] = useState(userRating || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, []);

    // Comment Form
    const { data, setData, post, processing, reset, errors } = useForm({
        body: '',
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
        setRatingSubmitting(true);
        const doSubmit = async () => {
            try {
                if (!window.axios) {
                    throw new Error('Axios belum tersedia');
                }
                await window.axios.post(route('news.rate', news.slug), { rating: value });
                router.reload({
                    only: ['averageRating', 'ratingCounts', 'totalRatings', 'userRating', 'news'],
                    preserveScroll: true,
                });
            } catch (e) {
                Swal.fire('Gagal', 'Gagal mengirim rating. Silakan coba lagi.', 'error');
            } finally {
                setRatingSubmitting(false);
            }
        };
        doSubmit();
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
        if (!image) return '/assets/images/hero/default.webp';
        if (image.startsWith('http')) return image;
        return `/storage/${image}`;
    };

    const isMeaningfulHtml = (value) => {
        if (typeof value !== 'string') return false;
        const text = value
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return /[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0600-\u06FF]/.test(text);
    };

    const commentsList = Array.isArray(comments?.data)
        ? comments.data
        : (Array.isArray(news?.comments) ? news.comments : []);

    const NewsListCard = ({ title, items, showEmpty = false }) => {
        if ((!items || items.length === 0) && !showEmpty) return null;

        return (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
                </div>
                <div className="p-4 space-y-3">
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <Link
                                key={item.id}
                                href={`/news/${item.slug}`}
                                className="group flex gap-3 rounded-xl p-2 hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-14 h-14 flex-none rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                                    {item.image ? (
                                        <img
                                            src={getImageUrl(item.image)}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <i className="fas fa-image"></i>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-gray-900 group-hover:text-secondary line-clamp-2">
                                        {item.title}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                        <i className="far fa-calendar"></i>
                                        <span>{formatDate(item.published_at || item.created_at)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-sm text-gray-500">
                            Belum ada berita terkait.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <WebLayout hasHeaderSpacer={true} transparentNavbar={false} fluid={true} noPadding={true}>
            <Head title={news.title} />

            <div className="min-h-screen bg-gray-50">
                <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-6">
                    {/* Breadcrumb */}
                    <nav className="flex text-sm text-gray-500 mb-6">
                        <Link href={route('home')} className="hover:text-secondary">Beranda</Link>
                        <span className="mx-2">/</span>
                        <Link href={route('news.index')} className="hover:text-secondary">Berita</Link>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 truncate max-w-[520px]">{news.title}</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <aside className="order-2 lg:order-1 lg:col-span-3">
                            <div className="lg:sticky lg:top-32 space-y-6">
                                <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-6">
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                                        <i className="far fa-comments mr-3 text-secondary"></i>
                                        Diskusi & Ulasan
                                    </h3>

                                    <div className="flex flex-col items-center mb-6 bg-gray-50 rounded-xl p-4">
                                        <div className="text-center mb-4">
                                            <div className="text-5xl font-bold text-gray-900 mb-1">{parseFloat(averageRating).toFixed(1)}</div>
                                            <div className="flex justify-center text-yellow-400 text-lg mb-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <i key={star} className={`${star <= Math.round(averageRating) ? 'fas' : 'far'} fa-star`}></i>
                                                ))}
                                            </div>
                                            <div className="text-gray-500 text-sm">{totalRatings} Ulasan</div>
                                        </div>

                                        <div className="w-full">
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

                                    {auth.user ? (
                                        <form onSubmit={submitComment} className="mb-8">
                                            <div className="mb-4">
                                                <label className="block text-gray-700 text-sm font-bold mb-2">Berikan Rating</label>
                                                <div className={`flex space-x-2 text-2xl ${ratingSubmitting ? 'opacity-60 pointer-events-none' : 'cursor-pointer'} text-gray-300`}>
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
                                                    value={data.body}
                                                    onChange={(e) => setData('body', e.target.value)}
                                                ></textarea>
                                                {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
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
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center mb-8">
                                            <p className="text-gray-700 mb-4">Silakan masuk untuk memberikan rating dan komentar.</p>
                                            <div className="flex justify-center space-x-4">
                                                <Link href="/login" className="bg-secondary text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Masuk</Link>
                                                <Link href="/register" className="bg-white text-secondary border border-secondary px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition">Daftar</Link>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 sm:space-y-6">
                                        {commentsList.filter((comment) => isMeaningfulHtml(comment.body)).length > 0 ? (
                                            commentsList.filter((comment) => isMeaningfulHtml(comment.body)).map((comment) => (
                                                <div key={comment.id} className="flex space-x-4 border-b border-gray-100 pb-4 last:border-0">
                                                    <img
                                                        src={comment.user?.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                        alt={comment.user?.name}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-bold text-gray-900">{comment.user?.name}</h4>
                                                            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                                                        </div>
                                                        <div
                                                            className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: typeof comment.body === 'string' ? comment.body : '' }}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</div>
                                        )}
                                    </div>

                                    {comments?.links && comments.links.length > 3 && (
                                        <div className="mt-6 flex flex-wrap justify-center gap-1">
                                            {comments.links.map((link, i) => (
                                                link.url ? (
                                                    <Link
                                                        key={i}
                                                        href={link.url}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${link.active
                                                            ? 'bg-secondary text-white shadow-md'
                                                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                                            }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        preserveScroll={true}
                                                        preserveState={true}
                                                        only={['comments', 'averageRating', 'ratingCounts', 'totalRatings', 'userRating', 'news']}
                                                    />
                                                ) : (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 rounded text-xs text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </aside>

                        <div className="order-1 lg:order-2 lg:col-span-6">
                            <article className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4 sm:mb-8">
                        {/* Featured Image */}
                        <div className="relative h-64 md:h-96 w-full">
                            <img 
                                src={getImageUrl(news.image)} 
                                alt={news.title} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/images/hero/default.webp';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-3 sm:p-6 md:p-8 text-white w-full">
                                <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                                    {news.category?.name || 'Umum'}
                                </span>
                                <h1 className="text-xl md:text-4xl font-bold leading-tight mb-2 text-shadow">
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
                        <div className="p-3 sm:p-6 md:p-10">
                            <div 
                                className="prose prose-lg max-w-none prose-blue text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: news.content }} 
                            />
                            
                            {/* Tags / Meta Footer */}
                            <div className="mt-6 pt-4 sm:mt-10 sm:pt-6 border-t border-gray-100 flex justify-between items-center">
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
                        </div>

                        <aside className="order-3 lg:col-span-3">
                            <div className="lg:sticky lg:top-32 space-y-6">
                                <NewsListCard title="Berita Terkait" items={relatedNews} showEmpty={true} />
                                <NewsListCard title="Berita Terkini" items={latestNews} />
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </WebLayout>
    );
}
