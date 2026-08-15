import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

// The API endpoints are public, so they don't strictly need a JWT token
// They will just return published content

export const useMissions = () => {
  return useQuery({
    queryKey: ['public', 'missions'],
    queryFn: async () => {
      const { data } = await api.get('/public/missions');
      return data;
    },
  });
};

export const useNews = () => {
  return useQuery({
    queryKey: ['public', 'news'],
    queryFn: async () => {
      const { data } = await api.get('/public/news');
      return data;
    },
  });
};

export const usePartners = () => {
  return useQuery({
    queryKey: ['public', 'partners'],
    queryFn: async () => {
      const { data } = await api.get('/public/partners');
      return data;
    },
  });
};

export const useImpactStats = () => {
  return useQuery({
    queryKey: ['public', 'impact'],
    queryFn: async () => {
      const { data } = await api.get('/public/impact');
      return data;
    },
  });
};

export const useDonations = () => {
  return useQuery({
    queryKey: ['public', 'donations'],
    queryFn: async () => {
      const { data } = await api.get('/donations');
      return data;
    },
  });
};

export const useGallery = () => {
  return useQuery({
    queryKey: ['public', 'gallery'],
    queryFn: async () => {
      const { data } = await api.get('/public/gallery');
      return data;
    },
  });
};
