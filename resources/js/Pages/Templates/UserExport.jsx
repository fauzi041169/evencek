import { Head, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function UserExport({ users }) {
    const { data, setData, post, processing } = useForm({
        format: 'excel',
        start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        role_filter: ''
    });

    const submit = (e) => {
        e.preventDefault();
        // Implement export logic here, usually a window.location.href or similar for download
        // or a post request that returns a download

    };

    return (
        <MainLayout>
            <Head title="Export User Data" />
            
            <div className="bg-gradient-to-r from-[#4e73df] to-[#224abe] text-white py-8 mb-8">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl font-bold">Export User Data</h1>
                    <p className="mb-0">Choose your preferred export format and options</p>
                </div>
            </div>

            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Export Options */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <h5 className="font-bold text-gray-700">Export Options</h5>
                            </div>
                            <div className="p-6">
                                <form onSubmit={submit}>
                                    {/* Format Selection */}
                                    <div className="mb-6">
                                        <label className="block text-gray-700 font-semibold mb-3">Export Format</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div 
                                                className={`cursor-pointer p-4 border rounded-lg text-center transition-all ${data.format === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                                onClick={() => setData('format', 'excel')}
                                            >
                                                <i className="fas fa-file-excel text-green-600 text-2xl mb-2"></i>
                                                <div className="font-medium">Excel</div>
                                            </div>
                                            <div 
                                                className={`cursor-pointer p-4 border rounded-lg text-center transition-all ${data.format === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                                onClick={() => setData('format', 'pdf')}
                                            >
                                                <i className="fas fa-file-pdf text-red-600 text-2xl mb-2"></i>
                                                <div className="font-medium">PDF</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date Range */}
                                    <div className="mb-6">
                                        <label className="block text-gray-700 font-semibold mb-2">Date Range</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input 
                                                type="date" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={data.start_date}
                                                onChange={e => setData('start_date', e.target.value)}
                                            />
                                            <input 
                                                type="date" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={data.end_date}
                                                onChange={e => setData('end_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Role Filter */}
                                    <div className="mb-6">
                                        <label className="block text-gray-700 font-semibold mb-2">Filter by Role</label>
                                        <select 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={data.role_filter}
                                            onChange={e => setData('role_filter', e.target.value)}
                                        >
                                            <option value="">All Roles</option>
                                            <option value="guest">Guest</option>
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="w-full bg-secondary text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-download"></i> Export Data
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h5 className="font-bold text-gray-700">Data Preview</h5>
                                <span className="bg-secondary/10 text-secondary text-xs font-semibold px-2.5 py-0.5 rounded">
                                    {users?.length || 0} records
                                </span>
                            </div>
                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users && users.length > 0 ? (
                                                users.map((user) => (
                                                    <tr key={user.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.profile?.no_hp || 'N/A'}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {user.profile ? (
                                                                <>
                                                                    {user.profile.regency?.name || 'N/A'}, {user.profile.province?.name || 'N/A'}
                                                                </>
                                                            ) : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No data available</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

