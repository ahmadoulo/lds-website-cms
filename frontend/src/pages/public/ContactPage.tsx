import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

export const ContactPage = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1500);
  };

  return (
    <div className="py-[100px] px-6">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-4 text-[#172642]">Contactez-nous</h1>
          <p className="text-lg text-[#172642]/70">
            Une question, une suggestion ou une envie de nous rejoindre ? Écrivez-nous.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-[#87CE18]/10 text-center py-16 px-8 rounded-3xl border border-[#87CE18]/20">
            <div className="w-20 h-20 bg-[#87CE18] text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-[#172642] mb-3">Message envoyé !</h3>
            <p className="text-[#172642]/70 text-lg">Nous vous répondrons dans les plus brefs délais.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_24px_50px_-18px_rgba(23,38,66,0.08)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-[#172642] mb-2">Prénom et Nom</label>
                <input required type="text" className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-[#00A4DE] transition-colors" placeholder="Ex: Aïssatou Diop" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#172642] mb-2">Email</label>
                <input required type="email" className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-[#00A4DE] transition-colors" placeholder="votre@email.com" />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#172642] mb-2">Sujet</label>
              <input required type="text" className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-[#00A4DE] transition-colors" placeholder="De quoi souhaitez-vous parler ?" />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-semibold text-[#172642] mb-2">Message</label>
              <textarea required rows={5} className="w-full bg-[#FBF9F5] border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-[#00A4DE] transition-colors resize-none" placeholder="Votre message..."></textarea>
            </div>
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-[#172642] hover:bg-[#EE7900] text-white py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            >
              {status === 'loading' ? 'Envoi en cours...' : <><Send className="w-4 h-4" /> Envoyer le message</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
