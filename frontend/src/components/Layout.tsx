import { Link, Outlet } from 'react-router-dom';
import { Settings, Cpu, Box, FileText } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="duagon Logo" className="h-10 w-auto" />
                        <div className="h-8 w-px bg-slate-300 mx-2"></div>
                        <span className="text-2xl font-light tracking-tight text-duagon-blue">Configurator</span>
                    </div>

                    {/* Navigation Removed to enforce flow */}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-duagon-blue text-white/80 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
                    &copy; {new Date().getFullYear()} duagon AG. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <Link to={to} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
            {icon}
            {label}
        </Link>
    );
}
