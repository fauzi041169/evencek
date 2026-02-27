import React, { useEffect, useRef, useState } from 'react';

function toEmbedUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v');
            if (v) return `https://www.youtube.com/embed/${v}`;
            const parts = u.pathname.split('/');
            const idx = parts.indexOf('embed');
            if (idx >= 0 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
        }
        if (u.hostname === 'youtu.be') {
            const id = u.pathname.replace('/', '');
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
    } catch {}
    return null;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Tulis deskripsi...' }) {
    const editorRef = useRef(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [showYoutube, setShowYoutube] = useState(false);
    const savedRangeRef = useRef(null);
    const [videoSize, setVideoSize] = useState('md'); // sm, md, lg
    const [anchorPos, setAnchorPos] = useState({ left: 0, top: 0 });

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const saveRange = () => {
        const editor = editorRef.current;
        const sel = window.getSelection();
        if (!editor || !sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
            savedRangeRef.current = range.cloneRange();
        }
    };

    const placeCaretAtEnd = (el) => {
        if (!el) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        savedRangeRef.current = range.cloneRange();
    };

    const restoreRange = () => {
        const editor = editorRef.current;
        const sel = window.getSelection();
        if (!editor || !sel) return;
        editor.focus();
        if (savedRangeRef.current) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        } else {
            placeCaretAtEnd(editor);
        }
    };

    const updateAnchorFromSelection = () => {
        const editor = editorRef.current;
        const sel = window.getSelection();
        if (!editor || !sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (!editor.contains(range.startContainer)) return;
        const caretRect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        setAnchorPos({
            left: Math.max(0, caretRect.left - editorRect.left),
            top: Math.max(0, caretRect.top - editorRect.top),
        });
    };

    const emitChange = () => {
        if (onChange) {
            onChange(editorRef.current?.innerHTML || '');
        }
    };

    const exec = (cmd, arg = null) => {
        restoreRange();
        document.execCommand(cmd, false, arg);
        emitChange();
        saveRange();
    };

    const insertHtml = (html) => {
        if (!html) return;
        restoreRange();
        document.execCommand('insertHTML', false, html);
        emitChange();
        saveRange();
    };

    const handleEmbed = () => {
        const embed = toEmbedUrl(youtubeUrl.trim());
        if (embed) {
            const sizeMap = {
                sm: { w: 420, h: 236 },
                md: { w: 560, h: 315 },
                lg: { w: 720, h: 405 },
            };
            const { w, h } = sizeMap[videoSize] || sizeMap.md;
            insertHtml(`<div class="yt-container my-3"><iframe src="${embed}" width="${w}" height="${h}" frameborder="0" allowfullscreen></iframe></div>`);
            setYoutubeUrl('');
            setShowYoutube(false);
        } else {
            alert('Link YouTube tidak valid');
        }
    };

    return (
        <div className="border rounded-lg relative">
            <div className="flex flex-wrap gap-2 px-3 py-2 border-b bg-gray-50">
                <button type="button" onClick={() => exec('bold')} className="px-2 py-1 rounded hover:bg-gray-200"><i className="fas fa-bold"></i></button>
                <button type="button" onClick={() => exec('italic')} className="px-2 py-1 rounded hover:bg-gray-200"><i className="fas fa-italic"></i></button>
                <button type="button" onClick={() => exec('underline')} className="px-2 py-1 rounded hover:bg-gray-200"><i className="fas fa-underline"></i></button>
                <button type="button" onClick={() => exec('insertUnorderedList')} className="px-2 py-1 rounded hover:bg-gray-200"><i className="fas fa-list-ul"></i></button>
                <button type="button" onClick={() => exec('insertOrderedList')} className="px-2 py-1 rounded hover:bg-gray-200"><i className="fas fa-list-ol"></i></button>
                <button
                    type="button"
                    onClick={() => {
                        saveRange();
                        const url = prompt('Masukkan URL tautan');
                        if (url) exec('createLink', url);
                    }}
                    className="px-2 py-1 rounded hover:bg-gray-200"
                >
                    <i className="fas fa-link"></i>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        saveRange();
                        updateAnchorFromSelection();
                        setShowYoutube(s => !s);
                    }}
                    className="px-2 py-1 rounded hover:bg-gray-200"
                >
                    <i className="fab fa-youtube mr-1"></i> Sematkan
                </button>
            </div>
            {showYoutube && (
                <div
                    className="absolute z-20 bg-white border rounded shadow-lg p-2"
                    style={{
                        left: anchorPos.left,
                        top: Math.max(0, anchorPos.top - 44),
                        minWidth: 320
                    }}
                >
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEmbed();
                                if (e.key === 'Escape') setShowYoutube(false);
                            }}
                            placeholder="Tempel link YouTube, misal https://youtu.be/VIDEO_ID"
                            className="flex-1 px-3 py-2 border rounded"
                        />
                        <select
                            value={videoSize}
                            onChange={(e) => setVideoSize(e.target.value)}
                            className="px-3 py-2 border rounded bg-white"
                            title="Ukuran Video"
                        >
                            <option value="sm">Kecil</option>
                            <option value="md">Sedang</option>
                            <option value="lg">Besar</option>
                        </select>
                        <button type="button" onClick={handleEmbed} className="px-4 py-2 bg-red-600 text-white rounded">Embed</button>
                    </div>
                </div>
            )}
            <div
                ref={editorRef}
                onInput={emitChange}
                onKeyUp={saveRange}
                onMouseUp={saveRange}
                onKeyDown={(e) => {
                    saveRange();
                    updateAnchorFromSelection();
                }}
                onFocus={saveRange}
                contentEditable
                className="min-h-[140px] px-3 py-2 focus:outline-none prose max-w-none"
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
}
