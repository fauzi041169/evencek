import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-6 max-w-4xl mx-auto mt-10 bg-white rounded-xl shadow-lg border border-red-100">
                    <div className="flex items-center gap-4 mb-4 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-2xl font-bold">Something went wrong</h2>
                    </div>
                    <p className="text-slate-600 mb-4">
                        Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba muat ulang halaman atau hubungi administrator jika masalah berlanjut.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-60 text-sm font-mono text-slate-700 mb-6">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Muat Ulang Halaman
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
