import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function CommitteeIndex({ activity }) {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const currentUserId = window.authUserId || null;

    useEffect(() => {
        loadConversations(false);
        const interval = setInterval(() => loadConversations(true), 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadMessages(selectedUser.id, false);
            const interval = setInterval(() => loadMessages(selectedUser.id, true), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadConversations = async (isBackground = false) => {
        try {
            const response = await fetch(route('activity.chat.conversations', activity.id));
            const data = await response.json();
            setConversations(data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading conversations:', error);
            setLoading(false);
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
        }
    };

    const loadMessages = async (userId, isBackground = false) => {
        try {
            const response = await fetch(`${route('activity.chat.messages', activity.id)}?user_id=${userId}`);
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
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

    const selectConversation = (user) => {
        setSelectedUser(user);
        loadConversations(true); // Refresh unread counts silently
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const response = await fetch(route('activity.chat.send', activity.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({
                    message: newMessage,
                    target_user_id: selectedUser.id
                })
            });

            const data = await response.json();
            if (data.success) {
                setNewMessage('');
                loadMessages(selectedUser.id, false);
                loadConversations(true);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal mengirim pesan',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Terjadi kesalahan saat mengirim pesan',
                timer: 3000,
                showConfirmButton: false
            });
        }
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    };

    return (
        <AcaraLayout activity={activity} title={`Pesan Peserta - ${activity.name}`}>
            
            <div className="container mx-auto px-4 py-8 h-[calc(100vh-100px)]">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden flex h-full">
                    {/* Sidebar: Conversation List */}
                    <div className="w-1/3 border-r border-gray-200 flex flex-col">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="font-bold text-gray-700">Pesan Masuk</h2>
                            <Link 
                                href={route('activity.detail', activity.id)} 
                                className="text-sm text-primary hover:text-primary"
                            >
                                Kembali ke Kegiatan
                            </Link>
                        </div>
                        <div className="overflow-y-auto flex-1" id="conversation-list">
                            {loading ? (
                                <div className="flex justify-center items-center h-20">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">Belum ada pesan masuk.</div>
                            ) : (
                                conversations.map((conv) => (
                                    <div 
                                        key={conv.user.id}
                                        onClick={() => selectConversation(conv.user)}
                                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            selectedUser?.id === conv.user.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                                <img 
                                                    src={conv.user.avatar ? `/storage/${conv.user.avatar}` : '/assets/images/profilefoto/default-profile.png'} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                    alt={conv.user.name}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h4 className="font-semibold text-gray-900 truncate">{conv.user.name}</h4>
                                                    <span className="text-xs text-gray-500 flex-shrink-0">{conv.last_time}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <p className="text-sm text-gray-500 truncate flex-1">{conv.last_message}</p>
                                                    {conv.unread_count > 0 && (
                                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                                                            {conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="w-2/3 flex flex-col bg-gray-50">
                        {!selectedUser ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <i className="fas fa-comments text-6xl mb-4 text-gray-300"></i>
                                <p className="text-lg">Pilih percakapan untuk melihat pesan</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 overflow-hidden">
                                            <img 
                                                src={selectedUser.avatar ? `/storage/${selectedUser.avatar}` : '/assets/images/profilefoto/default-profile.png'} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                alt={selectedUser.name}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{selectedUser.name}</h3>
                                            <span className="text-xs text-green-500 flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Peserta
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {messages.map((msg, index) => {
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
                                                            {!isMe && msg.sender?.name && `${msg.sender.name} â€¢ `}{time}
                                                        </span>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 bg-white border-t border-gray-200">
                                    <form onSubmit={sendMessage} className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="flex-1 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            placeholder="Balas pesan..." 
                                            autoComplete="off"
                                        />
                                        <button 
                                            type="submit" 
                                            className="bg-primary text-white rounded-lg px-6 py-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Kirim
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AcaraLayout>
    );
}

