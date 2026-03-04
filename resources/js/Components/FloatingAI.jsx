import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bot, User, Loader2, Minimize2, X, Mic, MicOff, Send, MessageSquare, Headset, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePage } from '@inertiajs/react';

const FloatingAI = () => {
    const { appSettings } = usePage().props;
    const isLocal = appSettings?.isLocal;

    // AI Mode: 'chat' or 'talk'
    const [aiMode, setAiMode] = useState('chat');

    // Voice & Tech States
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [permError, setPermError] = useState(null);
    const [isContinuous, setIsContinuous] = useState(false); // To handle talk-back loop

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: 'Halo! Saya AI Robot EventCek. Ada yang bisa saya bantu tentang aplikasi ini?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const isSpeakingRef = useRef(false);
    const silenceTimerRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const aiModeRef = useRef(aiMode);
    const isContinuousRef = useRef(isContinuous);
    const isLoadingRef = useRef(isLoading);
    const handleSubmitMessageRef = useRef(null);

    aiModeRef.current = aiMode;
    isContinuousRef.current = isContinuous;
    isLoadingRef.current = isLoading;

    // Initial Recognition Setup - create ONCE on mount to avoid memory leak & performance hit
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.lang = 'id-ID';
        rec.interimResults = true;

        rec.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            const currentLiveMessage = finalTranscriptRef.current + interimTranscript;
            setMessage(currentLiveMessage);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (currentLiveMessage.trim().length > 0) {
                silenceTimerRef.current = setTimeout(() => {
                    if (finalTranscriptRef.current.trim() || interimTranscript.trim()) {
                        rec.stop();
                        handleSubmitMessageRef.current?.(currentLiveMessage);
                    }
                }, 3000);
            }
        };

        rec.onerror = (event) => {
            if (event.error === 'not-allowed') setPermError('permission_blocked');
            setIsListening(false);
            setIsContinuous(false);
        };

        rec.onend = () => {
            setIsListening(false);
            finalTranscriptRef.current = '';
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (isContinuousRef.current && aiModeRef.current === 'talk' && !isSpeakingRef.current && !isLoadingRef.current) {
                setTimeout(() => {
                    try { rec.start(); setIsListening(true); } catch (e) { }
                }, 300);
            }
        };

        setRecognition(rec);
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            rec.abort?.();
        };
    }, []);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [chatHistory, isOpen, isMinimized]);

    const speakMessage = (text) => {
        if (isMuted || aiMode === 'chat' || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';

        utterance.onstart = () => {
            setIsSpeaking(true);
            isSpeakingRef.current = true;
            if (isListening) recognition.stop();
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            // If in continuous mode, start listening again after AI finishes talking
            if (isContinuous && aiMode === 'talk') {
                setTimeout(() => {
                    try { recognition.start(); setIsListening(true); } catch (e) { }
                }, 500);
            }
        };

        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang.startsWith('id'));
        if (idVoice) utterance.voice = idVoice;

        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = async () => {
        if (isListening || isContinuous) {
            setIsContinuous(false);
            recognition.stop();
            setIsListening(false);
            window.speechSynthesis.cancel();
            return;
        }

        setPermError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            setIsContinuous(true); // Enable auto-listening loop
            setIsSpeaking(false);
            window.speechSynthesis.cancel();
            recognition.start();
            setIsListening(true);
        } catch (err) {
            console.error('Mic Access Denied:', err);
            if (err.name === 'NotAllowedError') setPermError('permission_blocked');
            else setPermError('generic_error');
        }
    };

    const handleSubmitMessage = async (msgOverride = null) => {
        const msgToSend = msgOverride || message.trim();
        if (!msgToSend || isLoading) return;

        const userMessage = { role: 'user', content: msgToSend };
        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setIsLoading(true);

        try {
            // Performance trick: Smaller history for local AI speed
            const response = await axios.post(route('ai.chat'), {
                message: msgToSend,
                history: chatHistory.slice(-4) // Reduced history for faster local inference
            });

            const botMessage = { role: 'assistant', content: response.data.response };
            setChatHistory(prev => [...prev, botMessage]);
            if (aiMode === 'talk') {
                speakMessage(response.data.response);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: 'Terjadi kendala koneksi. Mohon coba lagi.'
            }]);
            setIsContinuous(false);
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = (mode) => {
        setAiMode(mode);
        setIsContinuous(false);
        window.speechSynthesis.cancel();
        if (recognition) recognition.stop();
        setPermError(null);
    };

    const fixUrl = () => {
        window.location.replace('http://localhost:8000');
    };

    handleSubmitMessageRef.current = handleSubmitMessage;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 z-[9999]"
                style={{ background: 'linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #d4ff00))', border: '2px solid white' }}
            >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
                <Bot size={28} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-[2147483647] transition-all duration-500 ease-in-out ${isMinimized ? 'w-14 h-14' : 'w-[360px] sm:w-[400px]'}`}>
            {isMinimized ? (
                <button onClick={() => setIsMinimized(false)} className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110">
                    <Bot size={24} />
                </button>
            ) : (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[600px] max-h-[92vh] animate-in slide-in-from-bottom-8 duration-500">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 ${isSpeaking ? 'animate-pulse ring-4 ring-white/30' : ''}`}>
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base mb-0.5">Robot AI Premium</h3>
                                    <div className="flex items-center gap-1.5 opacity-90">
                                        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}></span>
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                            {isListening ? 'Mendengarkan...' : isSpeaking ? 'Berbicara...' : aiMode === 'talk' ? 'Mode Ngobrol' : 'Mode Chat'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Minimize2 size={18} /></button>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="grid grid-cols-2 bg-black/15 p-1 rounded-2xl">
                            <button onClick={() => switchMode('chat')} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${aiMode === 'chat' ? 'bg-white text-primary shadow-lg' : 'text-white/70 hover:text-white'}`}>
                                <MessageSquare size={15} /> Chat Teks
                            </button>
                            <button onClick={() => switchMode('talk')} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${aiMode === 'talk' ? 'bg-white text-primary shadow-lg' : 'text-white/70 hover:text-white'}`}>
                                <Headset size={15} /> Suara Langsung
                            </button>
                        </div>
                    </div>

                    {/* Permission Recovery Helper */}
                    {permError === 'permission_blocked' && (
                        <div className="p-4 bg-red-50 border-b border-red-100 italic text-[11px] text-red-600 font-bold">
                            ⚠️ Mikrofon Terblokir! Klik ikon <span className="underline italic">Gembok</span> di bar alamat browser, pilih "Reset permission", lalu Refresh (F5).
                        </div>
                    )}

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/30 custom-scrollbar">
                        {chatHistory.map((chat, index) => (
                            <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${chat.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${chat.role === 'user' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100'}`}>
                                        {chat.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div
                                        onClick={() => chat.role === 'assistant' && aiMode === 'talk' && speakMessage(chat.content)}
                                        className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm transition-all ${chat.role === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : `bg-white text-gray-800 border border-gray-100 rounded-tl-none ${aiMode === 'talk' ? 'hover:shadow-md cursor-pointer active:scale-[0.98]' : ''}`
                                            }`}
                                    >
                                        {chat.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-gray-200 animate-pulse"></div>
                                <div className="px-4 py-3 bg-white rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tighter">
                                    <Loader2 size={14} className="animate-spin" /> Robot Sedang Berpikir...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Footer - Mode Ngobrol Full Screen Mic */}
                    <div className="p-6 bg-white border-t border-gray-50">
                        {aiMode === 'talk' ? (
                            <div className="flex flex-col items-center gap-5 py-2">
                                <div className="relative">
                                    {(isListening || isContinuous) && <div className="absolute -inset-4 bg-red-400/20 rounded-full animate-ping"></div>}
                                    {(isListening || isContinuous) && <div className="absolute -inset-8 bg-red-400/10 rounded-full animate-ping [animation-delay:-0.5s]"></div>}
                                    <button
                                        onClick={toggleListening}
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all z-10 relative shadow-2xl border-4 ${isListening || isContinuous ? 'bg-red-500 text-white border-red-200 scale-105' : 'bg-primary/5 text-primary hover:bg-primary/10 border-transparent shadow-none'}`}
                                    >
                                        {isListening || isContinuous ? <MicOff size={40} /> : <Mic size={40} />}
                                    </button>
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${isListening || isContinuous ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                        {isListening ? 'SAYA MENDENGAR...' : isContinuous ? 'MIC AKTIF' : 'KLIK UNTUK MULAI'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                                        {isContinuous ? 'Klik lagi untuk berhenti ngobrol' : 'Ngobrol terus tanpa klik-klik lagi'}
                                    </p>
                                </div>
                                {message && (
                                    <div className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] text-gray-500 italic text-center animate-in fade-in slide-in-from-bottom-2">
                                        "{message}"
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmitMessage(); }} className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Tulis sesuatu..."
                                        className="w-full pl-5 pr-12 py-4 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                        disabled={isLoading}
                                    />
                                    <button type="button" onClick={toggleListening} className={`absolute right-2 top-2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <Mic size={18} />
                                    </button>
                                </div>
                                <button type="submit" disabled={!message.trim() || isLoading} className={`p-4 rounded-2xl transition-all shadow-xl ${message.trim() && !isLoading ? 'bg-primary text-white shadow-primary/30 active:scale-95' : 'bg-gray-200 text-gray-400'}`}>
                                    <Send size={24} />
                                </button>
                            </form>
                        )}
                        <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
                            <Bot size={10} className="text-gray-400" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">AI Intelligent System</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingAI;
