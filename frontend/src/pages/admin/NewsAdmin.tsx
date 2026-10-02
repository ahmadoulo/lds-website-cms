import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, FileText, ImageIcon, Plus, ScanEye, Tag, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { commitImage, type ImageSelection } from '../../lib/pendingImage';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton, openPreview } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { SearchInput } from '../../components/admin/ui/SearchInput';
import { Pagination } from '../../components/admin/ui/Pagination';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { NewsArticle, NewsCategory, Paginated } from '../../lib/types';

interface FormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormValues = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  categoryId: '',
  isPublished: false,
};

export const NewsAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NewsArticle | null>(null);
  const [cover, setCover] = useState<ImageSelection>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ['admin', 'news', page, search],
    queryFn: async () =>
      (
        await api.get<Paginated<NewsArticle>>('/news', {
          params: { page, limit: 10, search: search || undefined },
        })
      ).data,
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'news', 'categories'],
    queryFn: async () => (await api.get<NewsCategory[]>('/news/categories')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const text = (value: Parameters<typeof localizedOrSource>[0]) =>
    localizedOrSource(value, locale).text;

  const openCreate = () => {
    setEditing(null);
    setCover(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (article: NewsArticle) => {
    setEditing(article);
    setCover(article.image);
    reset({
      // The form writes the French source, whatever language the screen is in.
      title: localized(article.title, 'fr'),
      slug: article.slug,
      excerpt: localized(article.excerpt, 'fr'),
      content: localized(article.content, 'fr'),
      categoryId: article.categoryId ?? '',
      isPublished: article.isPublished,
    });
    setIsFormOpen(true);
  };

  // Deep link from the dashboard (?edit=<id>): open the editor once the row is
  // loaded, then drop the parameter so a refresh does not reopen the dialog.
  const editParam = searchParams.get('edit');
  const handledEditParam = useRef<string | null>(null);

  useEffect(() => {
    if (!editParam || !listQuery.data || handledEditParam.current === editParam) return;

    const article = listQuery.data.data.find((item) => item.id === editParam);
    if (!article) return;

    handledEditParam.current = editParam;
    openEdit(article);

    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, listQuery.data]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setCover(null);
    reset(EMPTY_FORM);
  };

  const saveMutation = useAdminMutation<FormValues>({
    mutationFn: async (values) => {
      // The picked file reaches MinIO here, when the administrator commits.
      const uploaded = await commitImage(cover, 'news');

      const payload = {
        title: { fr: values.title },
        excerpt: { fr: values.excerpt },
        content: { fr: values.content },
        slug: values.slug || undefined,
        categoryId: values.categoryId || undefined,
        imageId: uploaded?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/news/${editing.id}`, payload)).data
        : (await api.post('/news', payload)).data;
    },
    successMessage: editing ? t.admin.news.updated : t.admin.news.created,
    invalidate: [['admin', 'news']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<NewsArticle>({
    mutationFn: async (article) =>
      (await api.patch(`/news/${article.id}`, { isPublished: !article.isPublished })).data,
    successMessage: t.admin.news.statusUpdated,
    invalidate: [['admin', 'news']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/news/${id}`)).data,
    successMessage: t.admin.news.deleted,
    invalidate: [['admin', 'news']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<NewsArticle>> = [
    {
      key: 'image',
      header: t.admin.common.visual,
      hideOnMobile: true,
      render: (article) =>
        article.image ? (
          <img
            src={article.image.url}
            alt=""
            className="h-11 w-16 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-11 w-16 items-center justify-center rounded-lg bg-warm-muted">
            <ImageIcon className="h-4 w-4 text-navy/30" />
          </div>
        ),
    },
    {
      key: 'title',
      header: t.admin.news.columnTitle,
      render: (article) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">
            {text(article.title) || t.admin.dashboard.untitled}
          </p>
          <p className="truncate text-xs text-navy/45">/{article.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: t.admin.news.columnCategory,
      render: (article) => (
        <span className="text-navy/70">{text(article.category?.name) || '—'}</span>
      ),
    },
    {
      key: 'date',
      header: t.admin.news.columnDate,
      render: (article) => (
        <span className="text-navy/60">
          {t.admin.common.formatDate(article.publishedAt ?? article.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.admin.common.status,
      render: (article) => (
        <Badge tone={article.isPublished ? 'green' : 'neutral'}>
          {article.isPublished ? t.admin.common.published : t.admin.common.draft}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.news.title}
        description={t.admin.news.description}
        actions={
          <>
            <PreviewButton path="/actualites" label={t.admin.common.preview} />
            <Button variant="outline" onClick={() => setIsCategoryOpen(true)}>
              <Tag className="h-4 w-4" /> {t.admin.news.categoriesButton}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.news.newArticle}
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t.admin.news.searchPlaceholder}
        />
      </div>

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.data.length ? (
        <EmptyState
          icon={FileText}
          title={search ? t.admin.common.noResults : t.admin.news.emptyTitle}
          description={
            search ? t.admin.news.emptySearchDescription : t.admin.news.emptyDescription
          }
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> {t.admin.news.emptyAction}
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={listQuery.data.data}
            rowKey={(article) => article.id}
            mobileTitle={(article) => text(article.title) || t.admin.dashboard.untitled}
            actions={(article) => (
              <>
                <IconButton
                  label={t.admin.news.previewArticle}
                  icon={ScanEye}
                  onClick={() => openPreview(`/actualites/${article.slug}`)}
                />
                <IconButton
                  label={article.isPublished ? t.admin.common.unpublish : t.admin.common.publish}
                  icon={article.isPublished ? EyeOff : Eye}
                  onClick={() => togglePublish.mutate(article)}
                  disabled={togglePublish.isPending}
                />
                <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(article)} />
                <IconButton
                  label={t.common.delete}
                  icon={Trash2}
                  tone="danger"
                  onClick={() => setPendingDelete(article)}
                />
              </>
            )}
          />
          <Pagination
            page={listQuery.data.meta.page}
            totalPages={listQuery.data.meta.totalPages}
            total={listQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? t.admin.news.editTitle : t.admin.news.createTitle}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button
              form="news-form"
              type="submit"
              isLoading={saveMutation.isPending}
            >
              {editing ? t.common.save : t.admin.news.createSubmit}
            </Button>
          </>
        }
      >
        <form
          id="news-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-5">
              <Field
                label={t.admin.news.titleLabel}
                htmlFor="news-title"
                required
                error={errors.title?.message}
              >
                <Input
                  id="news-title"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title', {
                    required: t.admin.news.titleRequired,
                    minLength: { value: 3, message: t.admin.news.titleTooShort },
                  })}
                />
              </Field>

              <Field
                label={t.admin.news.slugLabel}
                htmlFor="news-slug"
                hint={t.admin.news.slugHint}
                error={errors.slug?.message}
              >
                <Input
                  id="news-slug"
                  placeholder="retrospective-2026"
                  aria-invalid={Boolean(errors.slug)}
                  {...register('slug', {
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: t.admin.news.slugPattern,
                    },
                  })}
                />
              </Field>

              <Field label={t.admin.news.categoryLabel} htmlFor="news-category">
                <Select id="news-category" {...register('categoryId')}>
                  <option value="">{t.admin.news.categoryDefault}</option>
                  {categoriesQuery.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {text(category.name)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <MediaPicker
              value={cover}
              onChange={setCover}
            slot="newsCover"
              label={t.admin.news.coverLabel}
            />
          </div>

          <Field
            label={t.admin.news.excerptLabel}
            htmlFor="news-excerpt"
            required
            hint={t.admin.news.excerptHint}
            error={errors.excerpt?.message}
          >
            <Textarea
              id="news-excerpt"
              rows={2}
              aria-invalid={Boolean(errors.excerpt)}
              {...register('excerpt', {
                required: t.admin.news.excerptRequired,
                maxLength: { value: 600, message: t.admin.news.excerptMax },
              })}
            />
          </Field>

          <Field
            label={t.admin.news.contentLabel}
            htmlFor="news-content"
            required
            hint={t.admin.news.contentHint}
            error={errors.content?.message}
          >
            <Textarea
              id="news-content"
              rows={10}
              aria-invalid={Boolean(errors.content)}
              {...register('content', { required: t.admin.news.contentRequired })}
            />
          </Field>

          <Checkbox
            id="news-published"
            label={t.admin.news.publishCheckbox}
            hint={t.admin.news.publishHint}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <CategoriesModal isOpen={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} />

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.news.deleteTitle}
        message={t.admin.news.deleteMessage(text(pendingDelete?.title))}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};

/** Small inline manager for the article categories. */
const CategoriesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const t = useT();
  const { locale } = useLocale();
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<NewsCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'news', 'categories'],
    queryFn: async () => (await api.get<NewsCategory[]>('/news/categories')).data,
    enabled: isOpen,
  });

  const createMutation = useAdminMutation<string>({
    mutationFn: async (value) => (await api.post('/news/categories', { name: { fr: value } })).data,
    successMessage: t.admin.news.categoryCreated,
    invalidate: [['admin', 'news']],
    onSuccess: () => setName(''),
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/news/categories/${id}`)).data,
    successMessage: t.admin.news.categoryDeleted,
    invalidate: [['admin', 'news']],
    onSuccess: () => setPendingDelete(null),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.admin.news.categoriesTitle} size="md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length >= 2) createMutation.mutate(name.trim());
        }}
        className="mb-6 flex gap-2"
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.admin.news.categoryPlaceholder}
          aria-label={t.admin.news.categoryAriaLabel}
        />
        <Button type="submit" isLoading={createMutation.isPending} disabled={name.trim().length < 2}>
          <Plus className="h-4 w-4" /> {t.admin.common.add}
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState title={t.admin.news.categoriesEmpty} icon={Tag} className="border-0 py-8" />
      ) : (
        <ul className="divide-y divide-navy/8 rounded-xl border border-navy/8">
          {data.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  {localizedOrSource(category.name, locale).text}
                </p>
                <p className="text-xs text-navy/45">
                  /{category.slug} · {t.admin.news.articleCount(category._count?.news ?? 0)}
                </p>
              </div>
              <IconButton
                label={t.common.delete}
                icon={Trash2}
                tone="danger"
                onClick={() => setPendingDelete(category)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.news.deleteCategoryTitle}
        message={t.admin.news.deleteCategoryMessage}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </Modal>
  );
};
