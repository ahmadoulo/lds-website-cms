import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api/axios';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

const contactSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().min(5),
});

const socialSchema = z.object({
  facebook: z.string().url().or(z.string().length(0)),
  instagram: z.string().url().or(z.string().length(0)),
});

type ContactFormValues = z.infer<typeof contactSchema>;
type SocialFormValues = z.infer<typeof socialSchema>;

export const SettingsAdmin = () => {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      await api.patch(`/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'settings'] });
      setSuccessMsg('Paramètres mis à jour avec succès');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const contactForm = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });
  const socialForm = useForm<SocialFormValues>({ resolver: zodResolver(socialSchema) });

  useEffect(() => {
    if (settings) {
      if (settings.global_contact) {
        contactForm.reset(settings.global_contact);
      }
      if (settings.global_social) {
        socialForm.reset(settings.global_social);
      }
    }
  }, [settings, contactForm, socialForm]);

  const onContactSubmit = (data: ContactFormValues) => {
    mutation.mutate({ key: 'global_contact', value: data });
  };

  const onSocialSubmit = (data: SocialFormValues) => {
    mutation.mutate({ key: 'global_social', value: data });
  };

  if (isLoading) return <div className="p-8">Chargement des paramètres...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#172642]">Paramètres Généraux</h1>
        <p className="text-gray-500 mt-1">Gérez les informations de contact, les réseaux sociaux et le SEO du site.</p>
      </div>

      {successMsg && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center border border-green-200">
          <CheckCircle2 className="w-5 h-5 mr-3" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        
        {/* Contact Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#172642] mb-6">Informations de Contact</h2>
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de l'association</label>
                <input {...contactForm.register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00A4DE] focus:border-[#00A4DE] sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
                <input {...contactForm.register('phone')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00A4DE] focus:border-[#00A4DE] sm:text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse postale</label>
              <input {...contactForm.register('address')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00A4DE] focus:border-[#00A4DE] sm:text-sm" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={mutation.isPending} className="bg-[#00A4DE] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center hover:bg-[#0092c7]">
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>

        {/* Social Links Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#172642] mb-6">Réseaux Sociaux</h2>
          <form onSubmit={socialForm.handleSubmit(onSocialSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la page Facebook</label>
              <input {...socialForm.register('facebook')} type="url" placeholder="https://facebook.com/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00A4DE] focus:border-[#00A4DE] sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien du compte Instagram</label>
              <input {...socialForm.register('instagram')} type="url" placeholder="https://instagram.com/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00A4DE] focus:border-[#00A4DE] sm:text-sm" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={mutation.isPending} className="bg-[#00A4DE] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center hover:bg-[#0092c7]">
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
