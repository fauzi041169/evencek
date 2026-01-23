import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function CardPreview({ settings, user, activity, scale = 1 }) {
    if (!settings || !settings.card) return null;

    // Helper to resolve dynamic content
    const getContent = (id, config) => {
        const p = user.profile || {};
        
        // Handle Photo/Avatar
        if (config.data_key === 'photo' || id === 'photo' || (id && id.toString().startsWith('photo_'))) {
            const photoUrl = p.foto_url && p.foto_url !== 'undefined' 
                ? p.foto_url 
                : '/assets/images/profilefoto/default-profile.png';
            
            const shapeClass = config.shape === 'circle' ? 'rounded-full' : 'rounded-none';
            
            return (
                <img 
                    src={photoUrl} 
                    className={`w-full h-full object-cover ${shapeClass}`} 
                    alt="Foto Peserta" 
                    draggable={false}
                />
            );
        }

        // Handle QR Code
        if (config.data_key === 'qr' || id === 'qr' || (id && id.toString().startsWith('qr_'))) {
            // QR Value: Use specific data or fallback to validation URL
            // Default validation URL: /activity/{id}/validate/{user_id} (Example)
            // Or just the user code/ID
            const qrValue = config.text || `MEMBER:${user.id}:${activity.id}`; 
            
            return (
                <div className="w-full h-full bg-white p-1">
                     <QRCodeSVG
                        value={qrValue}
                        size={config.width} 
                        className="w-full h-full"
                        level="M"
                    />
                </div>
            );
        }

        // Handle Text
        // Resolving text content based on data_key is complex if we don't have the same logic as Design.jsx
        // Ideally Design.jsx saves the "text" property with the resolved value OR placeholder?
        // No, Design.jsx saves the config. The rendering logic resolves it.
        // We need to duplicate the resolution logic or simplify it.
        // Let's look at what Design.jsx does.
        // It has a getPreviewContent function or similar?
        // In Design.jsx, it uses `getContent`.
        
        let text = config.text || 'Teks';
        
        // If data_key is present, use it to fetch data
        if (config.data_key) {
            switch(config.data_key) {
                case 'name': text = user.name; break;
                case 'email': text = user.email; break;
                case 'no_hp': text = p.no_hp || '-'; break;
                case 'instansi': text = p.instansi || '-'; break;
                case 'province': text = p.province?.name || '-'; break;
                case 'regency': text = p.regency?.name || '-'; break;
                case 'district': text = p.district?.name || '-'; break;
                case 'village': text = p.village?.name || '-'; break;
                case 'custom': text = config.text || '-'; break;
                default: text = config.text || '-';
            }
        }

        return (
            <div style={{
                fontFamily: config.font || 'inherit',
                fontSize: `${config.size}px`,
                color: config.color,
                fontWeight: config.weight,
                textAlign: config.align,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center', // Vertically center text in its box? Design.jsx doesn't enforce this, it's just a div.
                justifyContent: config.align === 'center' ? 'center' : (config.align === 'right' ? 'flex-end' : 'flex-start'),
                whiteSpace: 'pre-wrap',
                lineHeight: 1.2
            }}>
                {text}
            </div>
        );
    };

    // Calculate dimensions
    const widthPx = (settings.card.width_cm || 5.4) * 37.795;
    const heightPx = (settings.card.height_cm || 8.6) * 37.795;

    return (
        <div style={{ width: widthPx * scale, height: heightPx * scale, margin: '0 auto' }}>
            <div 
                className="relative shadow-lg bg-white overflow-hidden"
                style={{
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    backgroundImage: settings.card.background ? `url(/assets/images/card/${settings.card.background})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {Object.entries(settings).map(([key, config]) => {
                    if (key === 'card' || !config.visible) return null;

                    return (
                        <div
                            key={key}
                            style={{
                                position: 'absolute',
                                left: `${config.left}px`,
                                top: `${config.top}px`,
                                width: `${config.width}px`,
                                height: `${config.height}px`,
                                zIndex: config.zIndex || 1,
                            }}
                        >
                            {getContent(key, config)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
