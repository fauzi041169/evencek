import React, { useMemo, useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { MessageSquareText, X, Send, ArrowLeft, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function ChatWidget({ activityId, ownerId, ownerName }) {
    const { auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPortrait, setIsPortrait] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(orientation: portrait)').matches;
    });
    const messagesEndRef = useRef(null);

    // Only show for logged in users
    // if (!auth.user) return null;

    const isOwner = auth.user && auth.user.id === ownerId;

    if (isPortrait) {
        return null;
    }

    const fetchUnreadCount = async () => {
        if (!auth.user) return;
        try {
            const response = await fetch(route('activity.chat.unread-count', activityId));
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.unread_count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    const fetchConversations = async (isBackground = false) => {
        if (!isOwner) return;
        if (!isBackground) setIsLoading(true);
        try {
            const response = await fetch(route('activity.chat.conversations', activityId));
            if (response.ok) {
                const data = await response.json();
                setConversations(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
            if (!isBackground) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memuat percakapan',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    const fetchMessages = async (isBackground = false) => {
        if (isOwner && !activeConversation) return;
        
        if (!isBackground) setIsLoading(true);
        try {
            const url = isOwner 
                ? route('activity.chat.messages', { activity: activityId, user_id: activeConversation.user.id })
                : route('activity.chat.messages', activityId);

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setMessages(data || []); 
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
            if (!isBackground) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memuat pesan',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Poll unread count every 30s
        return () => clearInterval(interval);
    }, [activityId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(orientation: portrait)');
        const updatePortrait = () => setIsPortrait(mql.matches);
        updatePortrait();
        if (mql.addEventListener) {
            mql.addEventListener('change', updatePortrait);
        } else {
            mql.addListener(updatePortrait);
        }
        return () => {
            if (mql.removeEventListener) {
                mql.removeEventListener('change', updatePortrait);
            } else {
                mql.removeListener(updatePortrait);
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen && auth.user) {
            const hasRealtime = typeof window !== 'undefined' && window.Echo && typeof window.Echo.private === 'function';
            if (isOwner) {
                if (activeConversation) {
                    fetchMessages(false);
                    if (!hasRealtime) {
                        const interval = setInterval(() => fetchMessages(true), 15000); // 15s kurangi load
                        return () => clearInterval(interval);
                    }
                } else {
                    fetchConversations(false);
                    const interval = setInterval(() => fetchConversations(true), 30000);
                    return () => clearInterval(interval);
                }
            } else {
                fetchMessages(false);
                if (!hasRealtime) {
                    const interval = setInterval(() => fetchMessages(true), 15000);
                    return () => clearInterval(interval);
                }
            }
        }
    }, [isOpen, activityId, isOwner, activeConversation]);

    useEffect(() => {
        const hasRealtime = typeof window !== 'undefined' && window.Echo && typeof window.Echo.private === 'function';
        if (!hasRealtime || !isOpen || !auth.user) return;

        if (isOwner && !activeConversation) return;

        const participantId = isOwner ? activeConversation?.user?.id : auth.user.id;
        if (!participantId) return;

        const channelName = `activity.${activityId}.chat.${participantId}`;
        const channel = window.Echo.private(channelName);

        channel.listen('.activity.chat.message.sent', (e) => {
            const incoming = e?.message;
            if (!incoming) return;

            setMessages((prev) => {
                if (prev.some((m) => String(m.id) === String(incoming.id))) return prev;
                return [...prev, incoming];
            });
        });

        return () => {
            channel.stopListening('.activity.chat.message.sent');
            window.Echo.leave(channelName);
        };
    }, [isOpen, activityId, isOwner, activeConversation, auth.user?.id]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        // For owner, target is the selected user. For user, target is themselves (as per controller logic)
        const targetId = isOwner ? activeConversation?.user?.id : auth.user.id;
        
        if (!targetId && isOwner) {
            console.error('No target user selected');
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
            id: tempId,
            activity_id: activityId,
            user_id: targetId,
            sender_id: auth.user.id,
            message: messageInput,
            created_at: new Date().toISOString(),
            sender: { id: auth.user.id, name: auth.user.name, avatar: auth.user.avatar },
        };

        setMessages(prev => [...prev, tempMessage]);
        setMessageInput('');
        scrollToBottom();

        try {
            const response = await fetch(route('activity.chat.send', activityId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    ...(window.Echo && typeof window.Echo.socketId === 'function' ? { 'X-Socket-Id': window.Echo.socketId() } : {}),
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    message: tempMessage.message,
                    target_user_id: targetId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send');
            }

            const data = await response.json();
            if (data?.message) {
                setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
            } else {
                fetchMessages(true);
            }
        } catch (error) {
            console.error('Send failed', error);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal mengirim pesan',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            // Optionally remove temp message
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const sparkData = useMemo(() => {
        const labels = [];
        const counts = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }));
            counts.push(0);
        }

        for (const msg of messages) {
            const dt = new Date(msg.created_at);
            if (Number.isNaN(dt.getTime())) continue;
            const diffDays = Math.floor((now - dt) / (24 * 60 * 60 * 1000));
            if (diffDays < 0 || diffDays > 6) continue;
            const idx = 6 - diffDays;
            counts[idx] += 1;
        }

        return {
            labels,
            datasets: [
                {
                    data: counts,
                    borderColor: 'rgba(255,255,255,0.95)',
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    tension: 0.35,
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 2,
                },
            ],
        };
    }, [messages]);

    const sparkOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { line: { capBezierPoints: true } },
    }), []);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-32 right-4 md:bottom-6 md:right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 flex items-center justify-center w-14 h-14"
                title="Hubungi Penyelenggara"
                style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <MessageSquareText className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Widget */}
            {isOpen && (
                <div className="fixed bottom-32 right-4 md:bottom-24 md:right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden h-[500px] max-h-[70vh] animate-fade-in-up" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}>
                    {/* Header */}
                    <div className="bg-indigo-600 p-3 flex justify-between items-center text-white shadow-sm">
                        <div className="flex items-center gap-2">
                            {isOwner && activeConversation && (
                                <button 
                                    onClick={() => setActiveConversation(null)}
                                    className="hover:bg-indigo-700 p-1 rounded-full transition"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <h3 className="font-bold truncate max-w-[200px]">
                                {isOwner 
                                    ? (activeConversation ? activeConversation.user.name : 'Pesan Masuk') 
                                    : 'Hubungi Penyelenggara'
                                }
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isOwner && messages.length > 0 && (
                                <div className="w-20 h-9">
                                    <Line data={sparkData} options={sparkOptions} />
                                </div>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-indigo-700 rounded-full w-8 h-8 flex items-center justify-center transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    {isOwner && !activeConversation ? (
                        /* Conversation List */
                        <div className="flex-1 overflow-y-auto bg-gray-50">
                            {isLoading && conversations.length === 0 ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10 text-sm p-4">
                                    <p>Belum ada pesan masuk.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {conversations.map((conv, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveConversation(conv)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-white transition bg-gray-50 text-left"
                                        >
                                            <div className="relative">
                                                <img 
                                                    src={conv.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.name)}&background=random`} 
                                                    alt={conv.user.name}
                                                    className="w-10 h-10 rounded-full object-cover" 
                                                />
                                                {conv.unread_count > 0 && (
                                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{conv.user.name}</h4>
                                                    <span className="text-xs text-gray-400">{conv.last_time}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Chat Messages Area */
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {isLoading && messages.length === 0 ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-500 mt-10 text-sm">
                                        <p>Belum ada pesan.</p>
                                        <p>Silakan mulai percakapan.</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        (() => {
                                            const isMe = auth.user && String(msg.sender_id) === String(auth.user.id);
                                            return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                                    }`}
                                            >
                                                <p>{msg.message}</p>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                            );
                                        })()
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-white border-t">
                                <form onSubmit={sendMessage} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="Tulis pesan..."
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageInput.trim()}
                                        className="bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
