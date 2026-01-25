import React from 'react';

export default function StyleEditor({ isOpen, styles, onStyleChange, onClose }) {
    if (!isOpen) return null;

    const handleChange = (section, key, value) => {
        onStyleChange({
            ...styles,
            [section]: {
                ...styles[section],
                [key]: value
            }
        });
    };

    return (
        <div className="fixed top-24 right-6 z-50 w-80 bg-[#1a1f2e]/95 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-xl overflow-y-auto max-h-[80vh] animate-in slide-in-from-right-10 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <i className="fas fa-paint-brush text-amber-500"></i> Style Editor
                </h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {/* Hero Section */}
            <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Hero Section</h4>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-300 mb-2">Blob 1 Color (Left)</label>
                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                            <input 
                                type="color" 
                                value={styles.hero?.blob1Color || '#4f46e5'} 
                                onChange={(e) => handleChange('hero', 'blob1Color', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                            />
                            <span className="text-xs font-mono text-gray-400">{styles.hero?.blob1Color || '#4f46e5'}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-300 mb-2">Blob 2 Color (Right)</label>
                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                            <input 
                                type="color" 
                                value={styles.hero?.blob2Color || '#f59e0b'} 
                                onChange={(e) => handleChange('hero', 'blob2Color', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                            />
                            <span className="text-xs font-mono text-gray-400">{styles.hero?.blob2Color || '#f59e0b'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Solutions Section */}
            <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Solutions Section</h4>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-300 mb-2">Background Color</label>
                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                            <input 
                                type="color" 
                                value={styles.solutions?.bgColor || '#0F121C'} 
                                onChange={(e) => handleChange('solutions', 'bgColor', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                            />
                            <span className="text-xs font-mono text-gray-400">{styles.solutions?.bgColor || '#0F121C'}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-300 mb-2">Card Background</label>
                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                            <input 
                                type="color" 
                                value={styles.solutions?.cardBg || '#131722'} 
                                onChange={(e) => handleChange('solutions', 'cardBg', e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                            />
                            <span className="text-xs font-mono text-gray-400">{styles.solutions?.cardBg || '#131722'}</span>
                        </div>
                    </div>
                </div>
            </div>

             {/* Background Image Control */}
             <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Background Image</h4>
                <div className="space-y-4">
                     <div>
                        <label className="block text-xs text-gray-300 mb-2">CTA Section Pattern</label>
                        <input 
                            type="text" 
                            placeholder="Image URL..."
                            value={styles.cta?.bgPattern || ''}
                            onChange={(e) => handleChange('cta', 'bgPattern', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
