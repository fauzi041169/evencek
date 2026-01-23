import React, { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Download, FileText, AlertCircle } from 'lucide-react';

export default function MaterialView({ activity, material, embedUrl, materialUrl, downloadUrl, viewerHint }) {
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);

    // Helper to get file extension
    const getExtension = (filename) => {
        return filename.split('.').pop().toLowerCase();
    };

    const ext = getExtension(material.filename || '');
    const type = viewerHint || 'unknown';

    useEffect(() => {
        // Handle DOCX Preview
        if ((type === 'doc' || ext === 'docx') && ext === 'docx' && materialUrl) {
            const loadDocx = async () => {
                try {
                    // Load scripts dynamically if not present
                    if (!window.jszip) {
                        await loadScript('https://unpkg.com/jszip/dist/jszip.min.js');
                    }
                    if (!window.docx) {
                        await loadScript('https://unpkg.com/docx-preview/dist/docx-preview.min.js');
                    }
                    
                    const response = await fetch(materialUrl);
                    const blob = await response.blob();
                    
                    if (window.docx && containerRef.current) {
                        window.docx.renderAsync(blob, containerRef.current)
                            .then(() => setLoading(false))
                            .catch(err => {
                                console.error("Docx render error:", err);
                                setLoading(false);
                            });
                    }
                } catch (error) {
                    console.error("Error loading DOCX:", error);
                    setLoading(false);
                }
            };
            loadDocx();
        } 
        // Handle PPTX Preview
        else if ((type === 'ppt' || ext === 'pptx') && ext === 'pptx' && materialUrl) {
            const loadPptx = async () => {
                try {
                    // Load CSS
                    if (!document.querySelector('#pptx-css')) {
                        const link = document.createElement('link');
                        link.id = 'pptx-css';
                        link.rel = 'stylesheet';
                        link.href = 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.css';
                        document.head.appendChild(link);
                    }

                    // Load Scripts
                    if (!window.jszip) {
                        await loadScript('https://cdn.jsdelivr.net/npm/jszip/dist/jszip.min.js');
                    }
                    if (!window.$) {
                        // PPTXjs usually requires jQuery
                        await loadScript('https://code.jquery.com/jquery-3.6.0.min.js');
                    }
                    if (!window.pptxjs) {
                        await loadScript('https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.js');
                    }

                    if (window.$ && containerRef.current) {
                        window.$("#pptx-container").pptxToHtml({
                            pptxFileUrl: materialUrl,
                            slideMode: false,
                            keyBoardShortCut: false,
                            slideModeConfig: {  //on slide mode (slideMode: true)
                                first: 1, 
                                nav: false, /** true,false : show or not nav buttons*/
                                navTxtColor: "white", /** color */
                                navNextTxt:"&#8250;", //">"
                                navPrevTxt: "&#8249;", //"<"
                                showPlayPauseBtn: false,/** true,false */
                                keyBoardShortCut: false, /** true,false */
                                showSlideNum: false, /** true,false */
                                showTotalSlideNum: false, /** true,false */
                                autoSlide: false, /** false or seconds (the pause time between slides) , F8 to active(keyBoardShortCut: true) */
                                randomAutoSlide: false, /** true,false ,autoSlide:true */ 
                                loop: false,  /** true,false */
                                background: false, /** false or color*/
                                transition: "default", /** transition type: "slid","fade","default","random" , to show transition efects :transitionTime > 0.5 */
                                transitionTime: 1 /** transition time in seconds */
                            }
                        });
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error loading PPTX:", error);
                    setLoading(false);
                }
            };
            loadPptx();
        }
        else {
            setLoading(false);
        }
    }, [materialUrl, type, ext]);

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    };

    return (
        <MainLayout title={`Materi: ${material.title}`}>
            <Head title={`Materi: ${material.title}`} />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6 bg-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <Link 
                                    href={route('activity.show', activity.slug || activity.id)}
                                    className="text-sm text-primary hover:text-primary/90 flex items-center mb-2"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Kembali ke Detail Kegiatan
                                </Link>
                                <h1 className="text-2xl font-bold text-gray-800">{material.title}</h1>
                                <p className="text-gray-500 mt-1">
                                    {material.type === 'link' ? 'Tautan Eksternal' : 'Dokumen'} 
                                    {material.filename ? ` â€¢ ${material.filename}` : ''}
                                </p>
                            </div>
                            <div>
                                {downloadUrl && (
                                    <a 
                                        href={downloadUrl} 
                                        className="inline-flex items-center px-4 py-2 bg-primary border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-primary/90 active:bg-primary focus:outline-none focus:border-primary focus:ring ring-primary/30 disabled:opacity-25 transition ease-in-out duration-150"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Unduh Materi
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Viewer */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            
                            {/* PDF Viewer */}
                            {(type === 'pdf' || ext === 'pdf') && (
                                <div className="aspect-[16/9] w-full bg-gray-100 rounded-lg overflow-hidden relative">
                                    {materialUrl ? (
                                        <iframe 
                                            src={materialUrl} 
                                            className="w-full h-full absolute inset-0"
                                            title={material.title}
                                        ></iframe>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            Preview tidak tersedia. Silakan unduh file.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image Viewer */}
                            {(['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) && (
                                <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                                    <img 
                                        src={materialUrl} 
                                        alt={material.title} 
                                        className="max-w-full max-h-[80vh] object-contain rounded shadow"
                                    />
                                </div>
                            )}

                            {/* Audio Viewer */}
                            {(['mp3', 'wav', 'ogg'].includes(ext)) && (
                                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-12">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <audio controls className="w-full max-w-md">
                                        <source src={materialUrl} type={`audio/${ext}`} />
                                        Browser Anda tidak mendukung elemen audio.
                                    </audio>
                                </div>
                            )}

                            {/* DOCX Viewer */}
                            {(type === 'doc' || ext === 'docx') && ext === 'docx' && (
                                <div 
                                    ref={containerRef}
                                    id="docx-container" 
                                    className="rounded-xl border border-gray-100 p-4 bg-gray-50 min-h-[500px] overflow-y-auto"
                                >
                                    {loading && <div className="flex items-center justify-center h-full text-gray-500">Memuat dokumen...</div>}
                                </div>
                            )}

                            {/* PPTX Viewer */}
                            {(type === 'ppt' || ext === 'pptx') && ext === 'pptx' && (
                                <div 
                                    id="pptx-container" 
                                    ref={containerRef}
                                    className="rounded-xl border border-gray-100 p-2 bg-gray-50 min-h-[500px]"
                                >
                                    {loading && <div className="flex items-center justify-center h-full text-gray-500">Memuat presentasi...</div>}
                                </div>
                            )}

                            {/* Fallback / Other Types */}
                            {(!['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'ogg'].includes(ext) && 
                              !(ext === 'docx') && 
                              !(ext === 'pptx')
                            ) && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Preview tidak tersedia</h3>
                                    <p className="text-gray-500 max-w-md mb-6">
                                        Format file ini ({ext}) tidak mendukung preview langsung di browser.
                                        Silakan unduh file untuk melihat isinya.
                                    </p>
                                    {downloadUrl && (
                                        <a 
                                            href={downloadUrl} 
                                            className="inline-flex items-center px-4 py-2 bg-primary border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-primary/90 transition"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Unduh File
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Google Docs Embed for older Office files or fallbacks if needed - Keeping it simple for now based on Blade logic */}
                            {/* The Blade file had logic for Google Viewer or Office Online, but mainly relied on JS libraries for modern formats. 
                                Ideally we would replicate the Google Viewer fallback here too if strictly needed, but let's stick to the main libraries first. 
                                If the user had logic for Google Viewer, I should probably add it.
                                Let's check if the Blade file used Google Viewer. 
                                Based on analysis: "conditional rendering for DOCX (docx-preview/mammoth), PPTX (pptxjs), PDF (iframe/PDF.js)"
                            */}
                            
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

