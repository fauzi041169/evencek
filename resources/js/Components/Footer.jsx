import React from 'react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function Footer({
    appName = 'ADZKIATEKNO',
    appLogo = null,
    tagline = 'Technology Solutions',
    description = null,
    services = null,
    contact = {
        address: 'Jl. Pendidikan No. 123, Jakarta Selatan, Indonesia',
        phone: '(021) 1234-5678',
        email: 'info@adzkiatekno.com',
        website: 'www.adzkiatekno.com'
    },
    socialLinks = {
        facebook: '#',
        twitter: '#',
        youtube: '#',
        instagram: '#'
    }
}) {
    const { t } = useTranslation();

    // Use translations if props are not provided
    const footerDescription = description || t('footer.description');
    const footerServices = services || [
        { label: t('footer.service_website'), href: '#' },
        { label: t('footer.service_mobile'), href: '#' },
        { label: t('footer.service_system'), href: '#' },
        { label: t('footer.service_game'), href: '#' },
        { label: t('footer.service_it'), href: '#' },
    ];

    // Try multiple logo paths as fallback
    const logoSrc = appLogo ? (
        appLogo.startsWith('http') ? appLogo :
            appLogo.startsWith('storage/') ? `/${appLogo}` :
                appLogo.startsWith('/') ? appLogo :
                    `/storage/${appLogo}`
    ) : '/assets/images/logo.png';

    return (
        <footer className="bg-gradient-to-r from-indigo-900 to-purple-900 relative overflow-hidden text-white py-12 w-full" style={{ marginBottom: 0, paddingBottom: 0 }}>
            {/* Curved top wave */}
            <svg className="absolute top-0 left-0 w-full h-16" viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,16 C240,48 360,32 720,16 C1080,0 1200,32 1440,64 L1440,0 L0,0 Z" fill="#ffffff"></path>
            </svg>

            <div className="container mx-auto px-4 md:px-8 lg:px-12">
                {/* Top Content Row - 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Column 1: Company Information */}
                    <div className="flex flex-col">
                        {/* Logo and Company Name */}
                        <div className="flex items-center mb-4">
                            <div className="footer-logo">
                                <img
                                    src={logoSrc}
                                    alt={`${appName} Logo`}
                                    className="h-16 w-16 object-cover rounded-lg"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                                />
                                <div className="h-16 w-16 bg-white/20 rounded-lg items-center justify-center hidden">
                                    <span className="text-2xl font-bold">{appName.substring(0, 4)}</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-2xl font-bold mb-0">{appName}</h3>
                                <p className="text-sm mt-0">{tagline}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm mb-6 text-gray-200 leading-relaxed">
                            {footerDescription}
                        </p>

                        {/* Social Media Icons */}
                        <div className="flex space-x-3">
                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} className="w-10 h-10 bg-white/10 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors" aria-label="Facebook">
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                            )}
                            {socialLinks.twitter && (
                                <a href={socialLinks.twitter} className="w-10 h-10 bg-white/10 hover:bg-sky-500 rounded-full flex items-center justify-center transition-colors" aria-label="Twitter">
                                    <i className="fab fa-twitter"></i>
                                </a>
                            )}
                            {socialLinks.youtube && (
                                <a href={socialLinks.youtube} className="w-10 h-10 bg-white/10 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors" aria-label="YouTube">
                                    <i className="fab fa-youtube"></i>
                                </a>
                            )}
                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} className="w-10 h-10 bg-white/10 hover:bg-pink-600 rounded-full flex items-center justify-center transition-colors" aria-label="Instagram">
                                    <i className="fab fa-instagram"></i>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Services */}
                    <div className="text-center md:text-left">
                        <h4 className="text-xl font-bold mb-4">{t('footer.services_title')}</h4>
                        <ul className="space-y-2">
                            {footerServices.map((service, index) => (
                                <li key={index}>
                                    <a href={service.href} className="text-gray-200 hover:text-white transition-colors">
                                        {service.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Contact Us */}
                    <div className="text-right md:text-right">
                        <h4 className="text-xl font-bold mb-4">{t('footer.contact_title')}</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-end">
                                <span className="text-gray-200">{contact.address}</span>
                                <i className="fas fa-map-marker-alt ml-2 text-white/70"></i>
                            </li>
                            <li className="flex items-center justify-end">
                                <span className="text-gray-200">{contact.phone}</span>
                                <i className="fas fa-phone ml-2 text-white/70"></i>
                            </li>
                            <li className="flex items-center justify-end">
                                <span className="text-gray-200">{contact.email}</span>
                                <i className="fas fa-envelope ml-2 text-white/70"></i>
                            </li>
                            <li className="flex items-center justify-end">
                                <span className="text-gray-200">{contact.website}</span>
                                <i className="fas fa-globe ml-2 text-white/70"></i>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-t border-gray-400 border-opacity-30 my-6" />

                {/* Copyright */}
                <div className="text-center">
                    <p className="text-sm">© {new Date().getFullYear()} {appName}. {t('footer.rights')}</p>
                </div>
            </div>
        </footer>
    );
}
