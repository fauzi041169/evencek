import { Head, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function UserProfileTemplate({ user }) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        // Add other fields as per original template intent, though snippets were cut off
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('profile.update'));
    };

    return (
        <MainLayout>
            <Head title="User Profile Template" />

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800">User Profile</h3>
                    </div>
                    <div className="p-6">
                        <form onSubmit={submit}>
                            {/* User Information */}
                            <div className="mb-8">
                                <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">User Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="mb-3">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input 
                                            type="text" 
                                            id="name" 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required 
                                        />
                                        {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            id="email" 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            required 
                                        />
                                        {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

