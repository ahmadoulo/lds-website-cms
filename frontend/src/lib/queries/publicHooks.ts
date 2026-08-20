import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import type {
  DonationMethod,
  GalleryAlbum,
  GalleryImage,
  ImpactStat,
  Mission,
  NewsArticle,
  Paginated,
  Partner,
  SiteSettings,
} from '../types';

/** Public content changes rarely; a short stale window keeps navigation instant. */
const PUBLIC_STALE_TIME = 1000 * 60 * 2;

const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const { data } = await api.get<T>(url, { params });
  return data;
};

export interface HomepagePayload {
  settings: SiteSettings;
  missions: Mission[];
  impact: ImpactStat[];
  news: NewsArticle[];
  gallery: GalleryImage[];
  partners: Partner[];
  donations: DonationMethod[];
}

/** One request that fills the entire homepage. */
export const useHomepage = () =>
  useQuery({
    queryKey: ['public', 'homepage'],
    queryFn: () => get<HomepagePayload>('/public/homepage'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useSiteSettings = () =>
  useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => get<SiteSettings>('/public/settings'),
    staleTime: 1000 * 60 * 10,
  });

export const useMissions = () =>
  useQuery({
    queryKey: ['public', 'missions'],
    queryFn: () => get<Mission[]>('/public/missions'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useNews = (page = 1, limit = 9) =>
  useQuery({
    queryKey: ['public', 'news', page, limit],
    queryFn: () => get<Paginated<NewsArticle>>('/public/news', { page, limit }),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useNewsArticle = (slug: string | undefined) =>
  useQuery({
    queryKey: ['public', 'news', 'detail', slug],
    queryFn: () => get<{ article: NewsArticle; related: NewsArticle[] }>(`/public/news/${slug}`),
    enabled: Boolean(slug),
  });

export const usePartners = () =>
  useQuery({
    queryKey: ['public', 'partners'],
    queryFn: () => get<Partner[]>('/public/partners'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useImpactStats = () =>
  useQuery({
    queryKey: ['public', 'impact'],
    queryFn: () => get<ImpactStat[]>('/public/impact'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useDonations = () =>
  useQuery({
    queryKey: ['public', 'donations'],
    queryFn: () => get<DonationMethod[]>('/public/donations'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useGalleryAlbums = () =>
  useQuery({
    queryKey: ['public', 'gallery', 'albums'],
    queryFn: () => get<GalleryAlbum[]>('/public/gallery'),
    staleTime: PUBLIC_STALE_TIME,
  });

export const useGalleryImages = () =>
  useQuery({
    queryKey: ['public', 'gallery', 'images'],
    queryFn: () => get<GalleryImage[]>('/public/gallery/images'),
    staleTime: PUBLIC_STALE_TIME,
  });
