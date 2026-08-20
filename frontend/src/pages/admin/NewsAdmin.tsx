import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, FileText, ImageIcon, Plus, ScanEye, Tag, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
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
import { t, type Media, type NewsArticle, type NewsCategory, type Paginated } from '../../lib/types';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NewsArticle | null>(null);
  const [cover, setCover] = useState<Media | null>(null);
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
      title: t(article.title),
      slug: article.slug,
      excerpt: t(article.excerpt),
      content: t(article.content),
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
      const payload = {
        title: { fr: values.title },
        excerpt: { fr: values.excerpt },
        content: { fr: values.content },
        slug: values.slug || undefined,
        categoryId: values.categoryId || undefined,
        imageId: cover?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/news/${editing.id}`, payload)).data
        : (await api.post('/news', payload)).data;
    },
    successMessage: editing ? 'Actualité mise à jour.' : 'Actualité créée.',
    invalidate: [['admin', 'news']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<NewsArticle>({
    mutationFn: async (article) =>
      (await api.patch(`/news/${article.id}`, { isPublished: !article.isPublished })).data,
    successMessage: 'Statut de publication mis à jour.',
    invalidate: [['admin', 'news']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/news/${id}`)).data,
    successMessage: 'Actualité supprimée.',
    invalidate: [['admin', 'news']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<NewsArticle>> = [
    {
      key: 'image',
      header: 'Visuel',
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
      header: 'Titre',
      render: (article) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{t(article.title, 'Sans titre')}</p>
          <p className="truncate text-xs text-navy/45">/{article.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      render: (article) => (
        <span className="text-navy/70">{t(article.category?.name, '—')}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (article) => (
        <span className="text-navy/60">
          {new Date(article.publishedAt ?? article.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (article) => (
        <Badge tone={article.isPublished ? 'green' : 'neutral'}>
          {article.isPublished ? 'Publié' : 'Brouillon'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Actualités"
        description="Articles, événements et bilans publiés sur le site."
        actions={
          <>
            <PreviewButton path="/actualites" />
            <Button variant="outline" onClick={() => setIsCategoryOpen(true)}>
              <Tag className="h-4 w-4" /> Catégories
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nouvelle actualité
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
          placeholder="Rechercher un article…"
        />
      </div>

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.data.length ? (
        <EmptyState
          icon={FileText}
          title={search ? 'Aucun résultat' : "Vous n'avez encore aucune actualité"}
          description={
            search
              ? 'Aucun article ne correspond à votre recherche.'
              : 'Publiez votre première actualité pour la faire apparaître sur le site.'
          }
          action={
            !search && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Créer une actualité
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
            mobileTitle={(article) => t(article.title, 'Sans titre')}
            actions={(article) => (
              <>
                <IconButton
                  label="Prévisualiser cet article"
                  icon={ScanEye}
                  onClick={() => openPreview(`/actualites/${article.slug}`)}
                />
                <IconButton
                  label={article.isPublished ? 'Dépublier' : 'Publier'}
                  icon={article.isPublished ? EyeOff : Eye}
                  onClick={() => togglePublish.mutate(article)}
                  disabled={togglePublish.isPending}
                />
                <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(article)} />
                <IconButton
                  label="Supprimer"
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
        title={editing ? "Modifier l'actualité" : 'Nouvelle actualité'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button
              form="news-form"
              type="submit"
              isLoading={saveMutation.isPending}
            >
              {editing ? 'Enregistrer' : "Créer l'actualité"}
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
              <Field label="Titre" htmlFor="news-title" required error={errors.title?.message}>
                <Input
                  id="news-title"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title', {
                    required: 'Le titre est obligatoire',
                    minLength: { value: 3, message: 'Le titre est trop court' },
                  })}
                />
              </Field>

              <Field
                label="Slug (adresse de la page)"
                htmlFor="news-slug"
                hint="Laissez vide pour le générer automatiquement à partir du titre."
                error={errors.slug?.message}
              >
                <Input
                  id="news-slug"
                  placeholder="retrospective-2026"
                  aria-invalid={Boolean(errors.slug)}
                  {...register('slug', {
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: 'Minuscules, chiffres et tirets uniquement',
                    },
                  })}
                />
              </Field>

              <Field label="Catégorie" htmlFor="news-category">
                <Select id="news-category" {...register('categoryId')}>
                  <option value="">Catégorie par défaut</option>
                  {categoriesQuery.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {t(category.name)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <MediaPicker
              value={cover}
              onChange={setCover}
              folder="news"
            slot="newsCover"
              label="Image de couverture"
            />
          </div>

          <Field
            label="Extrait"
            htmlFor="news-excerpt"
            required
            hint="Résumé affiché sur les cartes et dans les résultats de recherche."
            error={errors.excerpt?.message}
          >
            <Textarea
              id="news-excerpt"
              rows={2}
              aria-invalid={Boolean(errors.excerpt)}
              {...register('excerpt', {
                required: "L'extrait est obligatoire",
                maxLength: { value: 600, message: '600 caractères maximum' },
              })}
            />
          </Field>

          <Field
            label="Contenu"
            htmlFor="news-content"
            required
            hint="Le HTML simple est accepté (paragraphes, gras, listes, liens, images)."
            error={errors.content?.message}
          >
            <Textarea
              id="news-content"
              rows={10}
              aria-invalid={Boolean(errors.content)}
              {...register('content', { required: 'Le contenu est obligatoire' })}
            />
          </Field>

          <Checkbox
            id="news-published"
            label="Publier cette actualité"
            hint="Une actualité non publiée reste visible uniquement dans l'administration."
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <CategoriesModal isOpen={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} />

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer cette actualité ?"
        message={`« ${t(pendingDelete?.title, '')} » sera définitivement supprimée du site. Cette action est irréversible.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};

/** Small inline manager for the article categories. */
const CategoriesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<NewsCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'news', 'categories'],
    queryFn: async () => (await api.get<NewsCategory[]>('/news/categories')).data,
    enabled: isOpen,
  });

  const createMutation = useAdminMutation<string>({
    mutationFn: async (value) => (await api.post('/news/categories', { name: { fr: value } })).data,
    successMessage: 'Catégorie créée.',
    invalidate: [['admin', 'news']],
    onSuccess: () => setName(''),
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/news/categories/${id}`)).data,
    successMessage: 'Catégorie supprimée.',
    invalidate: [['admin', 'news']],
    onSuccess: () => setPendingDelete(null),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Catégories d'actualités" size="md">
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
          placeholder="Nom de la catégorie"
          aria-label="Nom de la nouvelle catégorie"
        />
        <Button type="submit" isLoading={createMutation.isPending} disabled={name.trim().length < 2}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState title="Aucune catégorie" icon={Tag} className="border-0 py-8" />
      ) : (
        <ul className="divide-y divide-navy/8 rounded-xl border border-navy/8">
          {data.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{t(category.name)}</p>
                <p className="text-xs text-navy/45">
                  /{category.slug} · {category._count?.news ?? 0} article(s)
                </p>
              </div>
              <IconButton
                label="Supprimer"
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
        title="Supprimer cette catégorie ?"
        message="Les articles rattachés à cette catégorie seront conservés mais n'auront plus de catégorie."
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </Modal>
  );
};
