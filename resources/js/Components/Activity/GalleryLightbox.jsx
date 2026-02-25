import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function GalleryLightbox({ isOpen, onClose, images, initialIndex = 0 }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex, isOpen]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') onClose();
    };

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!images || images.length === 0) return null;

    const getGalleryImageUrl = (imageRecord) => {
        if (!imageRecord?.image) return '/assets/images/hero/defoult.webp';
        const raw = imageRecord.image;
        if (raw.startsWith('http')) return raw;
        const clean = raw.replace(/^activities\/gallery\//, '').replace(/^storage\/activities\/gallery\//, '');
        return clean ? `/storage/activities/gallery/${clean}` : '/assets/images/hero/defoult.webp';
    };

    const currentImage = images[currentIndex];
    const imageUrl = getGalleryImageUrl(currentImage);

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/90" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-0 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full h-screen transform overflow-hidden text-left align-middle shadow-xl transition-all flex flex-col">
                                {/* Toolbar */}
                                <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent">
                                    <div className="text-sm font-medium">
                                        {currentIndex + 1} / {images.length}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <a 
                                            href={imageUrl} 
                                            download 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-full hover:bg-white/20 transition-colors"
                                            title="Unduh"
                                        >
                                            <Download className="w-6 h-6" />
                                        </a>
                                        <button 
                                            onClick={onClose}
                                            className="p-2 rounded-full hover:bg-white/20 transition-colors"
                                        >
                                            <X className="w-8 h-8" />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Image Area */}
                                <div className="flex-1 relative flex items-center justify-center h-full">
                                    {/* Prev Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>

                                    {/* Image */}
                                    <div className="relative w-full h-full flex items-center justify-center p-4 md:p-10" onClick={onClose}>
                                        <img 
                                            src={imageUrl} 
                                            alt="Gallery Preview" 
                                            className="max-w-full max-h-full object-contain shadow-2xl"
                                            onClick={(e) => e.stopPropagation()}
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/hero/defoult.webp'; }}
                                        />
                                    </div>

                                    {/* Next Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </div>

                                {/* Thumbnails (Optional, maybe for later) */}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
