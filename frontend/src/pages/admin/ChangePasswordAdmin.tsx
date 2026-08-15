import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api/axios';

export const ChangePasswordAdmin = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      await api.post('/auth/change-password', { newPassword: password });

      // Update local context
      updateUser({ mustChangePassword: false });
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-6 font-montserrat">
      <div className="bg-white p-8 rounded-3xl shadow-[0_24px_50px_-18px_rgba(23,38,66,0.1)] w-full max-w-[480px]">
        <div className="w-16 h-16 bg-[#EE7900]/10 text-[#EE7900] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-extrabold text-[#172642] mb-3">Sécurité requise</h1>
        <p className="text-[#172642]/70 text-[15px] leading-relaxed mb-8">
          C'est votre première connexion. Veuillez changer votre mot de passe par défaut avant de pouvoir accéder au tableau de bord.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 flex items-start gap-3 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#172642] mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-[#EE7900] transition-colors"
                placeholder="Au moins 8 caractères"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#172642] mb-2">Confirmer le mot de passe</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-[#EE7900] transition-colors"
                placeholder="Répétez le mot de passe"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#EE7900] hover:bg-[#172642] text-white py-4 rounded-xl font-bold text-[15px] mt-2 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
          >
            {isLoading ? 'Enregistrement...' : <><Save className="w-4 h-4" /> Enregistrer le mot de passe</>}
          </button>
        </form>
      </div>
    </div>
  );
};
