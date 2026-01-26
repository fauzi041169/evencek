import React, { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { MessageSquareText, X, Send, ArrowLeft, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ChatWidget({ activityId, ownerId, ownerName }) {
    const { auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    // Only show for logged in users
    // if (!auth.user) return null;

    const isOwner = auth.user && auth.user.id === ownerId;

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
        if (isOpen && auth.user) {
            if (isOwner) {
                if (activeConversation) {
                    fetchMessages(false);
                    const interval = setInterval(() => fetchMessages(true), 10000);
                    return () => clearInterval(interval);
                } else {
                    fetchConversations(false);
                    const interval = setInterval(() => fetchConversations(true), 30000);
                    return () => clearInterval(interval);
                }
            } else {
                fetchMessages(false);
                const interval = setInterval(() => fetchMessages(true), 10000);
                return () => clearInterval(interval);
            }
        }
    }, [isOpen, activityId, isOwner, activeConversation]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        // For owner, target is the selected user. For user, target is themselves (as per controller logic)
        const targetId = isOwner ? activeConversation?.user?.id : auth.user.id;
        
        if (!targetId && isOwner) {
            console.error('No target user selected');
            return;
        }

        const tempMessage = {
            id: Date.now(),
            message: messageInput,
            is_sender: true,
            created_at: new Date().toISOString(),
            user: { name: auth.user.name, avatar: auth.user.avatar }
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
            
            // Refresh messages to get server timestamp/ID
            fetchMessages(true);
        } catch (error) {
            console.error('Send failed', error);
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

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 flex items-center justify-center w-14 h-14"
                title="Hubungi Penyelenggara"
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
                <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden h-[500px] max-h-[70vh] animate-fade-in-up">
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
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-indigo-700 rounded-full w-8 h-8 flex items-center justify-center transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
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
                                        <div
                                            key={msg.id || idx}
                                            className={`flex ${msg.is_sender ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.is_sender
                                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                                    }`}
                                            >
                                                <p>{msg.message}</p>
                                                <p className={`text-[10px] mt-1 ${msg.is_sender ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
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
