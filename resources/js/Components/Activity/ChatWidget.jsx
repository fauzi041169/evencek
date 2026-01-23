import React, { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { MessageCircle, X, Send, ArrowLeft, Loader2 } from 'lucide-react';

export default function ChatWidget({ activityId, ownerId, ownerName }) {
    const { auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    // Only show for logged in users
    if (!auth.user) return null;

    const fetchMessages = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(route('activity.chat.messages', activityId));
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
                // Mark as read logic if needed
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            // Optional: Set up polling or echo here
            const interval = setInterval(fetchMessages, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [isOpen, activityId]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

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
                body: JSON.stringify({ message: tempMessage.message })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send');
            }
            
            // Refresh messages to get server timestamp/ID
            fetchMessages();
        } catch (error) {
            console.error('Send failed', error);
            // Optionally remove temp message or show error
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
                title="Chat dengan Panitia"
            >
                <MessageCircle className="w-6 h-6" />
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
                            <h3 className="font-bold">Chat Panitia</h3>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-indigo-700 rounded-full w-8 h-8 flex items-center justify-center transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {isLoading && messages.length === 0 ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10 text-sm">
                                <p>Belum ada pesan.</p>
                                <p>Silakan mulai percakapan dengan panitia.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div 
                                    key={msg.id || idx} 
                                    className={`flex ${msg.is_sender ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                            msg.is_sender 
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
                </div>
            )}
        </>
    );
}
