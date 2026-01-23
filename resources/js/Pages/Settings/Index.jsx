import React, { useMemo, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Index({
    colorGroups = {},
    appName,
    appLogoUrl,
    appFaviconUrl,
    heroBackgrounds = [],
    heroAnimationStyle = 'circles',
    navbarOpacity = '1',
}) {
    const initialColors = useMemo(() => {
        const map = {};
        Object.values(colorGroups).forEach((group) => {
            group.forEach((setting) => {
                map[setting.key] = setting.value;
            });
        });
        return map;
    }, [colorGroups]);

    const [logoPreview, setLogoPreview] = useState(appLogoUrl);
    const [faviconPreview, setFaviconPreview] = useState(appFaviconUrl);
    const [heroPreviews, setHeroPreviews] = useState(
        heroBackgrounds.reduce((acc, item) => {
            acc[item.key] = item.url;
            return acc;
        }, {})
    );
    const [opacityPercent, setOpacityPercent] = useState(Math.round(parseFloat(navbarOpacity || '1') * 100));

    const { data, setData, post, processing, errors } = useForm({
        app_name: appName || '',
        logo: null,
        favicon: null,
        hero_background_1: null,
        hero_background_2: null,
        hero_background_3: null,
        colors: initialColors,
        colors_text: initialColors,
        navbar_opacity: parseFloat(navbarOpacity || '1').toFixed(2),
        hero_animation_style: heroAnimationStyle,
    });

    const updateColor = (key, value) => {
        setData('colors', { ...data.colors, [key]: value });
        setData('colors_text', { ...data.colors_text, [key]: value });
    };

    const handleFilePreview = (file, setter) => {
        if (!file) {
            return;
        }
        const url = URL.createObjectURL(file);
        setter(url);
    };

    const handleHeroFile = (key, file) => {
        setData(key, file);
        handleFilePreview(file, (url) =>
            setHeroPreviews((prev) => ({
                ...prev,
                [key]: url,
            }))
        );
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('settings.update'), { forceFormData: true });
    };

    return (
        <MainLayout>
            <Head title="Pengaturan Website" />
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="w-full px-4">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary to-secondary">
                            <h1 className="text-2xl font-bold text-white">
                                <i className="fas fa-cog mr-2"></i>Pengaturan Website
                            </h1>
                            <p className="text-white/90 mt-1">Atur nama aplikasi, logo, favicon, dan warna standar</p>
                        </div>

                        <form onSubmit={submit} className="p-6 space-y-8" encType="multipart/form-data">
                            <section className="pb-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <i className="fas fa-cog mr-2"></i>Pengaturan Aplikasi
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Aplikasi</label>
                                        <input
                                            type="text"
                                            value={data.app_name}
                                            onChange={(e) => setData('app_name', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Logo Aplikasi</label>
                                        <div className="flex items-center gap-4">
                                            <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg border object-cover" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    setData('logo', file);
                                                    handleFilePreview(file, setLogoPreview);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        {errors.logo && <p className="text-sm text-red-600 mt-1">{errors.logo}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Favicon Aplikasi</label>
                                        <div className="flex items-center gap-4">
                                            <img src={faviconPreview} alt="Favicon" className="h-12 w-12 rounded border object-cover" />
                                            <input
                                                type="file"
                                                accept="image/*,.ico"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    setData('favicon', file);
                                                    handleFilePreview(file, setFaviconPreview);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        {errors.favicon && <p className="text-sm text-red-600 mt-1">{errors.favicon}</p>}
                                    </div>
                                </div>
                            </section>

                            <section className="pb-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <i className="fas fa-image mr-2"></i>Background Hero Beranda
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {heroBackgrounds.map((item) => (
                                        <div key={item.key}>
                                            <img
                                                src={heroPreviews[item.key]}
                                                alt={item.label}
                                                className="h-20 w-full object-cover rounded-lg border mb-2"
                                            />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleHeroFile(item.key, e.target.files[0])}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="pb-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <i className="fas fa-magic mr-2"></i>Model Animasi Hero
                                </h2>
                                <select
                                    value={data.hero_animation_style}
                                    onChange={(e) => setData('hero_animation_style', e.target.value)}
                                    className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="circles">Lingkaran Mengambang</option>
                                    <option value="rain">Rintik Hujan Menyamping</option>
                                    <option value="waves">Gelombang Diagonal</option>
                                    <option value="particles">Partikel Salju</option>
                                    <option value="parallax">Overlay Parallax</option>
                                    <option value="clean">Bersih (Tanpa Animasi)</option>
                                </select>
                            </section>

                            <section className="pb-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <i className="fas fa-adjust mr-2"></i>Transparansi Navbar
                                </h2>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={opacityPercent}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            setOpacityPercent(value);
                                            setData('navbar_opacity', (value / 100).toFixed(2));
                                        }}
                                        className="w-full"
                                    />
                                    <span className="text-sm text-gray-600">{opacityPercent}%</span>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    <i className="fas fa-palette mr-2"></i>Pengaturan Warna
                                </h2>
                                {Object.entries(colorGroups).map(([groupName, groupColors]) => (
                                    <div key={groupName}>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3">{groupName}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {groupColors.map((setting) => (
                                                <div key={setting.key} className="border border-gray-200 rounded-xl p-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {setting.key.replace('color_', '').replace(/_/g, ' ')}
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={data.colors_text[setting.key] || ''}
                                                            onChange={(e) => updateColor(setting.key, e.target.value)}
                                                            className="w-24 h-9 px-2 border border-gray-300 rounded-lg text-xs font-mono"
                                                        />
                                                        <input
                                                            type="color"
                                                            value={data.colors[setting.key] || '#ffffff'}
                                                            onChange={(e) => updateColor(setting.key, e.target.value)}
                                                            className="w-9 h-9 border border-gray-300 rounded-lg"
                                                        />
                                                        <span
                                                            className="inline-block w-9 h-9 rounded-lg border"
                                                            style={{ backgroundColor: data.colors[setting.key] || '#ffffff' }}
                                                        ></span>
                                                    </div>
                                                    {setting.description && (
                                                        <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>

                            <div className="flex justify-end pt-6 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 rounded-lg text-white bg-secondary hover:bg-blue-700"
                                >
                                    <i className="fas fa-save mr-2"></i>Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

