import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import MainLayout from '@/Layouts/MainLayout';

export default function UserIndex({ activity }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
    const messagesContainerRef = useRef(null);
    const currentUserId = window.authUserId || null;

    useEffect(() => {
        loadMessages(false);
        const interval = setInterval(() => loadMessages(true), 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            setIsScrolledToBottom(scrollHeight - scrollTop === clientHeight);
        }
    };

    const loadMessages = async (isBackground = false) => {
        try {
            const response = await fetch(route('activity.chat.messages', activity.id));
            const data = await response.json();
            setMessages(data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading messages:', error);
            setLoading(false);
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
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Optimistic UI update
        const tempMessage = {
            id: Date.now(),
            message: newMessage,
            sender_id: currentUserId,
            created_at: new Date().toISOString(),
            sender: { name: 'Anda' }
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        scrollToBottom();

        try {
            const response = await fetch(route('activity.chat.send', activity.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ 
                    message: newMessage,
                    target_user_id: currentUserId
                })
            });

            const data = await response.json();
            if (!data.success) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal mengirim pesan',
                    timer: 3000,
                    showConfirmButton: false
                });
                // Remove optimistic message on failure
                setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal mengirim pesan',
                timer: 3000,
                showConfirmButton: false
            });
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    };

    return (
        <MainLayout>
            <Head title={`Chat hubungi panitia - ${activity.name}`} />
            
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[600px]">
                    {/* Header */}
                    <div className="bg-primary p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <Link 
                                href={route('activity.detail', activity.id)} 
                                className="text-white hover:text-indigo-200"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold">Chat hubungi panitia</h1>
                                <p className="text-sm opacity-90">{activity.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div 
                        className="flex-1 overflow-y-auto p-4 bg-gray-50" 
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                    >
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <i className="fas fa-comments text-4xl mb-2"></i>
                                <p>Belum ada pesan. Mulai percakapan dengan panitia!</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.sender_id === currentUserId;
                                const msgDate = new Date(msg.created_at).toLocaleDateString();
                                const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString() : null;
                                const showDateSep = msgDate !== prevDate;
                                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDateSep && (
                                            <div className="flex justify-center my-4">
                                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{msgDate}</span>
                                            </div>
                                        )}
                                        <div className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                                <div className={`${isMe ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-800'} rounded-2xl px-4 py-2 shadow-sm break-words`}
                                                     dangerouslySetInnerHTML={{ __html: escapeHtml(msg.message) }}>
                                                </div>
                                                <span className="text-xs text-gray-500 mt-1 px-1">
                                                    {!isMe && msg.sender?.name && `${msg.sender.name} - `}{time}
                                                </span>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 rounded-full border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                placeholder="Tulis pesan anda..." 
                                autoComplete="off"
                            />
                            <button 
                                type="submit" 
                                className="bg-primary text-white rounded-full p-3 w-12 h-12 flex items-center justify-center hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

