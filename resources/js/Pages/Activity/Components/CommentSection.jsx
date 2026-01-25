import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

const CommentItem = ({ comment, activityId, depth = 0 }) => {
    const { auth } = usePage().props;
    const [isReplying, setIsReplying] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        body: '',
        parent_id: comment.id,
        rating: null,
    });

    const submitReply = (e) => {
        e.preventDefault();
        post(route('activity.comments.store', activityId), {
            preserveScroll: true,
            onSuccess: () => {
                setIsReplying(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Balasan berhasil dikirim',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // Limit nesting depth to prevent UI breaking
    const maxDepth = 3;

    return (
        <div className={`flex gap-4 ${depth > 0 ? 'mt-4 ml-4 md:ml-12 border-l-2 border-gray-100 pl-4' : 'mt-6'}`}>
            <div className="flex-shrink-0">
                <img
                    className="h-10 w-10 rounded-full object-cover border border-gray-200"
                    src={comment.user?.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}&color=7F9CF5&background=EBF4FF`}
                    alt={comment.user?.name}
                />
            </div>
            <div className="flex-grow">
                <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <span className="font-bold text-gray-900 mr-2">{comment.user?.name}</span>
                            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                        </div>
                        {comment.rating && (
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <i
                                        key={i}
                                        className={`fas fa-star text-xs ${i < comment.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    ></i>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-gray-700 whitespace-pre-line text-sm" dangerouslySetInnerHTML={{ __html: comment.body }}></div>
                </div>

                <div className="mt-2 flex items-center gap-4">
                    {auth.user && depth < maxDepth && (
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="text-sm text-gray-500 hover:text-indigo-600 font-medium transition"
                        >
                            <i className="fas fa-reply mr-1"></i> Balas
                        </button>
                    )}
                </div>

                {isReplying && (
                    <div className="mt-4">
                        <form onSubmit={submitReply}>
                            <textarea
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                className="w-full rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm text-sm"
                                placeholder={`Balas komentar ${comment.user?.name}...`}
                                rows="3"
                                required
                            ></textarea>
                            {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsReplying(false)}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                                >
                                    {processing ? 'Mengirim...' : 'Kirim Balasan'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Recursive render for children */}
                {comment.children && comment.children.length > 0 && (
                    <div className="space-y-4">
                        {comment.children.map((child) => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                activityId={activityId}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function CommentSection({ activity, comments }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, reset, errors } = useForm({
        body: '',
        rating: 5,
        parent_id: null,
    });

    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.comments.store', activity.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Komentar berhasil dikirim',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    // Calculate stats
    const totalComments = activity.comments_count || comments.length;
    const averageRating = activity.statistics?.average_rating || 0;

    return (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i className="fas fa-comments text-indigo-500"></i>
                    Komentar & Ulasan
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {totalComments}
                    </span>
                </h3>
                {averageRating > 0 && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                        <i className="fas fa-star text-yellow-400"></i>
                        <span className="font-bold text-yellow-700">{averageRating}</span>
                        <span className="text-xs text-yellow-600">/ 5.0</span>
                    </div>
                )}
            </div>

            {/* New Comment Form */}
            {auth.user ? (
                <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-3">Tulis Komentar</h4>
                    <form onSubmit={handleSubmit}>
                        {/* Rating Input */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setData('rating', star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="focus:outline-none transition transform hover:scale-110"
                                    >
                                        <i className={`fas fa-star text-xl ${(hoverRating || data.rating) >= star ? 'text-yellow-400' : 'text-gray-300'}`}></i>
                                    </button>
                                ))}
                                <span className="ml-2 text-sm text-gray-600 font-medium">
                                    {hoverRating || data.rating ? (hoverRating || data.rating) + '.0' : 'Pilih rating'}
                                </span>
                            </div>
                        </div>

                        <textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            className="w-full rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                            placeholder="Bagikan pendapat atau pertanyaan Anda tentang kegiatan ini..."
                            rows="3"
                            required
                        ></textarea>
                        {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}

                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                            >
                                <i className="fas fa-paper-plane mr-2"></i>
                                {processing ? 'Mengirim...' : 'Kirim Komentar'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <p className="text-gray-600 mb-3">Silakan masuk untuk menulis komentar.</p>
                    <a
                        href={route('login')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Masuk / Daftar
                    </a>
                </div>
            )}

            {/* Comment List */}
            <div className="space-y-2">
                {comments && comments.length > 0 ? (
                    comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} activityId={activity.id} />
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <div className="mb-3">
                            <i className="fas fa-comments text-4xl text-gray-200"></i>
                        </div>
                        <p>Belum ada komentar. Jadilah yang pertama berkomentar!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
