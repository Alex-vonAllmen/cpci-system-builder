import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Lock } from 'lucide-react';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const data = await api.auth.login(formData);
            login(data.access_token);
            navigate('/admin');
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[600px]">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-3">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
                    <p className="text-slate-500">Please sign in to continue</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
