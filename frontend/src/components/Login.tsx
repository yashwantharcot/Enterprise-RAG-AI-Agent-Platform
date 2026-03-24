import React, { useState } from 'react';
import { login } from '../services/api';

export interface LoginProps {
  onLoginSuccess: (token: string) => void;
  onToggleToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onToggleToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await login({ email, password });
      if (resp.access_token) {
        onLoginSuccess(resp.access_token);
      } else {
        setError('Login failed: Token not received');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117] text-white">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#161b22] border border-gray-800 shadow-2xl">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 text-center mb-6">
          Welcome Back
        </h2>
        
        {error && (
          <div className="p-3 mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 py-3 rounded-lg font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={onToggleToRegister}
            className="text-blue-400 hover:underline font-semibold"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};
