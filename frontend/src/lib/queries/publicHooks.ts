import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { usePreview } from '../../context/PreviewContext';
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

/**
 * Preview results are cached under their own key: a draft must never end up in
 * the cache a normal visitor reads, and leaving preview must show the live site
 * again without a reload.
 */
function usePreviewKey() {
  const { isPreview, params } = usePreview();
  return { scope: isPreview ? 'preview' : 'public', params };
}

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
export const useHomepage = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'homepage'],
    queryFn: () => get<HomepagePayload>('/public/homepage', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useSiteSettings = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'settings'],
    queryFn: () => get<SiteSettings>('/public/settings', params),
    staleTime: 1000 * 60 * 10,
  });
};

export const useMissions = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'missions'],
    queryFn: () => get<Mission[]>('/public/missions', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useNews = (page = 1, limit = 9) => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'news', page, limit],
    queryFn: () => get<Paginated<NewsArticle>>('/public/news', { page, limit, ...params }),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useNewsArticle = (slug: string | undefined) => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'news', 'detail', slug],
    queryFn: () =>
      get<{ article: NewsArticle; related: NewsArticle[] }>(`/public/news/${slug}`, params),
    enabled: Boolean(slug),
  });
};

export const usePartners = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'partners'],
    queryFn: () => get<Partner[]>('/public/partners', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useImpactStats = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'impact'],
    queryFn: () => get<ImpactStat[]>('/public/impact', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useDonations = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'donations'],
    queryFn: () => get<DonationMethod[]>('/public/donations', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useGalleryAlbums = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'gallery', 'albums'],
    queryFn: () => get<GalleryAlbum[]>('/public/gallery', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};

export const useGalleryImages = () => {
  const { scope, params } = usePreviewKey();
  return useQuery({
    queryKey: ['public', scope, 'gallery', 'images'],
    queryFn: () => get<GalleryImage[]>('/public/gallery/images', params),
    staleTime: PUBLIC_STALE_TIME,
  });
};
