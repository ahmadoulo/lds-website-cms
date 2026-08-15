import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api/axios';
import { Edit2, Trash2, Plus, X, Save, Eye, EyeOff } from 'lucide-react';

export const DonationsAdmin = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: donations, isLoading } = useQuery({
    queryKey: ['admin', 'donations'],
    queryFn: async () => {
      const { data } = await api.get('/donations?admin=true');
      return data;
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/donations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'donations'] });
      setIsModalOpen(false);
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => api.patch(`/donations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'donations'] });
      setEditingId(null);
      setIsModalOpen(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/donations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'donations'] });
    }
  });

  const onSubmit = (data: any) => {
    // Transform flat inputs into the expected JSON structure
    const payload = {
      title: { fr: data.title_fr },
      description: { fr: data.description_fr },
      actionType: data.actionType,
      actionData: data.actionData,
      actionLabel: { fr: data.actionLabel_fr },
      iconColor: data.iconColor,
      isPublished: data.isPublished
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (donation: any) => {
    setEditingId(donation.id);
    reset({
      title_fr: donation.title.fr,
      description_fr: donation.description.fr,
      actionType: donation.actionType,
      actionData: donation.actionData,
      actionLabel_fr: donation.actionLabel.fr,
      iconColor: donation.iconColor,
      isPublished: donation.isPublished
    });
    setIsModalOpen(true);
  };

  const togglePublish = (donation: any) => {
    updateMutation.mutate({ id: donation.id, data: { isPublished: !donation.isPublished } });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#172642]">Méthodes de don</h1>
          <p className="text-gray-500 mt-1">Gérez les moyens par lesquels les utilisateurs peuvent vous soutenir.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); reset(); setIsModalOpen(true); }}
          className="bg-[#EE7900] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center hover:bg-[#d66d00]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une méthode
        </button>
      </div>

      {isLoading ? (
        <div>Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Données (Numéro/Lien)</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donations?.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-semibold text-[#172642]">{d.title?.fr}</td>
                  <td className="px-6 py-4 text-gray-600">{d.actionData}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => togglePublish(d)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${d.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {d.isPublished ? <><Eye className="w-3 h-3 mr-1" /> Publié</> : <><EyeOff className="w-3 h-3 mr-1" /> Brouillon</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 p-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(d.id)} className="text-red-500 hover:text-red-700 p-2 ml-2"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#172642]">{editingId ? 'Modifier' : 'Ajouter'} une méthode de don</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre (ex: Faire un don financier)</label>
                <input {...register('title_fr')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...register('description_fr')} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'action</label>
                  <select {...register('actionType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="phone">Numéro (Orange Money/Wave)</option>
                    <option value="link">Lien web (GoFundMe, etc)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Données (Numéro ou URL)</label>
                  <input {...register('actionData')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre de l'action</label>
                  <input {...register('actionLabel_fr')} placeholder="Via Orange Money / Wave" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur de l'icône</label>
                  <select {...register('iconColor')} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="orange">Orange</option>
                    <option value="blue">Bleu</option>
                    <option value="green">Vert</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center mt-4">
                <input type="checkbox" {...register('isPublished')} id="isPublished" className="w-4 h-4 text-[#EE7900] rounded border-gray-300" />
                <label htmlFor="isPublished" className="ml-2 text-sm text-gray-700 font-medium">Publier immédiatement</label>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">Annuler</button>
                <button type="submit" className="bg-[#EE7900] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#d66d00]">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
