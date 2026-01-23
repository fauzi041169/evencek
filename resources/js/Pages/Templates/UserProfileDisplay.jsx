import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function UserProfileDisplay({ user, profile }) {
    return (
        <MainLayout>
            <Head title="User Profile Display" />

            <div className="bg-gradient-to-r from-[#4e73df] to-[#224abe] text-white py-8 mb-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="shrink-0">
                            <img 
                                src={user.profile_photo_url} 
                                alt="Profile Photo" 
                                className="w-[150px] h-[150px] rounded-full border-4 border-white object-cover"
                                onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                            />
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                            <p className="mb-1 opacity-90"><i className="fas fa-envelope mr-2"></i> {user.email}</p>
                            <p className="mb-0 opacity-90 capitalize"><i className="fas fa-user-tag mr-2"></i> Role: {user.role}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-700">
                            Contact Information
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
                                <p className="font-medium">{profile?.no_hp || 'Not provided'}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-500 mb-1">Gender</label>
                                <p className="font-medium">{profile?.jenis_kelamin || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-700">
                            Professional Information
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm text-gray-500 mb-1">Occupation</label>
                                <p className="font-medium">{profile?.pekerjaan || 'Not provided'}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-500 mb-1">Position</label>
                                <p className="font-medium">{profile?.jabatan || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-700">
                            Address Information
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3">
                                    <label className="block text-sm text-gray-500 mb-1">Full Address</label>
                                    <p className="font-medium">{profile?.alamat || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Province</label>
                                    <p className="font-medium">{profile?.province?.name || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Regency</label>
                                    <p className="font-medium">{profile?.regency?.name || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">District</label>
                                    <p className="font-medium">{profile?.district?.name || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
