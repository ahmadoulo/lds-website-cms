import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api/axios';
import { Edit2, Trash2, Plus, X, Eye, EyeOff, Image as ImageIcon, Loader2 } from 'lucide-react';

export const NewsAdmin = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const { data: news, isLoading } = useQuery({
    queryKey: ['admin', 'news'],
    queryFn: async () => {
      const { data } = await api.get('/news?admin=true');
      return data;
    }
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/news', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'news'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => api.patch(`/news/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'news'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/news/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'news'] });
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'news');

    try {
      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue('imageId', data.id);
      setCoverUrl(data.url);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Erreur lors du téléchargement de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCoverUrl(null);
    reset();
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setCoverUrl(item.image?.url || null);
    reset({
      title_fr: item.title.fr,
      slug: item.slug,
      excerpt_fr: item.excerpt.fr,
      content_fr: item.content.fr,
      categoryId: item.categoryId || '00000000-0000-0000-0000-000000000000', // Placeholder
      imageId: item.imageId,
      isPublished: item.isPublished
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    // Generate a simple slug if empty
    const slug = data.slug || data.title_fr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const payload = {
      title: { fr: data.title_fr },
      slug,
      excerpt: { fr: data.excerpt_fr },
      content: { fr: data.content_fr },
      categoryId: data.categoryId || '00000000-0000-0000-0000-000000000000', // Note: in reality, fetch categories and pick one
      imageId: data.imageId,
      isPublished: data.isPublished
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const togglePublish = (item: any) => {
    updateMutation.mutate({ id: item.id, data: { isPublished: !item.isPublished } });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#172642]">Actualités</h1>
          <p className="text-gray-500 mt-1">Gérez les articles et annonces du site.</p>
        </div>
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="bg-[#00A4DE] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center hover:bg-[#0092c7]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un article
        </button>
      </div>

      {isLoading ? (
        <div>Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-20">Image</th>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {news?.map((n: any) => (
                <tr key={n.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    {n.image ? (
                      <img src={n.image.url} className="w-12 h-12 object-cover rounded-lg" alt="" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-400" /></div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#172642]">{n.title?.fr}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => togglePublish(n)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${n.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {n.isPublished ? <><Eye className="w-3 h-3 mr-1" /> Publié</> : <><EyeOff className="w-3 h-3 mr-1" /> Brouillon</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(n)} className="text-blue-600 hover:text-blue-800 p-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(n.id)} className="text-red-500 hover:text-red-700 p-2 ml-2"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#172642]">{editingId ? 'Modifier' : 'Créer'} un article</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'article</label>
                    <input {...register('title_fr')} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                    <input {...register('slug')} placeholder="genere-automatiquement" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image de couverture</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {isUploading ? (
                      <div className="py-8 flex flex-col items-center text-[#00A4DE]"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span>Upload...</span></div>
                    ) : coverUrl ? (
                      <img src={coverUrl} alt="Cover" className="h-32 w-full object-cover rounded-lg" />
                    ) : (
                      <div className="py-8 flex flex-col items-center text-gray-500"><ImageIcon className="w-8 h-8 mb-2 text-gray-400" /><span>Cliquez pour uploader une image</span></div>
                    )}
                    {/* Hidden input to hold the media ID */}
                    <input type="hidden" {...register('imageId')} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extrait court</label>
                <textarea {...register('excerpt_fr')} required rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu complet (HTML/Texte)</label>
                <textarea {...register('content_fr')} required rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
              </div>

              <div className="flex items-center mt-4">
                <input type="checkbox" {...register('isPublished')} id="isPublished" className="w-4 h-4 text-[#00A4DE] rounded border-gray-300" />
                <label htmlFor="isPublished" className="ml-2 text-sm text-gray-700 font-medium">Publier immédiatement</label>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">Annuler</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#00A4DE] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#0092c7]">
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
