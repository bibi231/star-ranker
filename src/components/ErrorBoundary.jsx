import { Component } from 'react';

export default class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Page crashed:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col gap-4 p-8">
                    <span className="text-6xl">⚠️</span>
                    <h1 className="text-white text-2xl font-bold">Something went wrong</h1>
                    <p className="text-gray-400 text-center max-w-md">
                        The page encountered an error. Your account and balance are safe.
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.href = '/';
                        }}
                        className="bg-[#C9A84C] text-[#0D1B2A] font-bold px-6 py-3 rounded-xl mt-4 hover:bg-white transition-all"
                    >
                        Return to Home
                    </button>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="text-red-400 text-xs max-w-lg overflow-auto bg-black/40 p-4 rounded-lg mt-4">
                            {this.state.error?.toString()}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
