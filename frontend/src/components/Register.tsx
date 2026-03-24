import React, { useState } from 'react';
import { register } from '../services/api';

export interface RegisterProps {
  onRegisterSuccess: () => void;
  onToggleToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onToggleToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await register({ name, email, password });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117] text-white">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#161b22] border border-gray-800 shadow-2xl">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 text-center mb-6">
          Create Account
        </h2>
        
        {error && (
          <div className="p-3 mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-400">FullName</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
              placeholder="John Doe"
            />
          </div>

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
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <button
            onClick={onToggleToLogin}
            className="text-blue-400 hover:underline font-semibold"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};
