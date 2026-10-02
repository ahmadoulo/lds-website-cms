-- ---------------------------------------------------------------------------
-- Les contenus editoriaux de SiteSettings passent de "texte" a { "fr", "ar" }.
--
-- AUCUN changement de schema : SiteSettings.value et draftValue sont deja des
-- colonnes JSONB. Ce sont les sous-champs editoriaux qui changent de forme, et
-- ils adoptent exactement celle que portent deja les seize colonnes
-- editoriales du reste du modele, donc le meme resolveur les lit.
--
-- NON DESTRUCTIVE : la valeur francaise existante est DEPLACEE sous la cle
-- "fr", jamais remplacee. Aucune traduction arabe n'est inventee ici - la
-- colonne arabe reste absente jusqu'a ce que l'association la renseigne, et
-- c'est ce qui permet au site de signaler une traduction manquante au lieu de
-- faire croire qu'elle existe.
--
-- REJOUABLE : la conversion ne s'applique qu'aux champs encore stockes comme
-- une chaine (jsonb_typeof = 'string'). Un champ deja converti est ignore, donc
-- relancer la migration ne produit ni { "fr": { "fr": ... } } ni perte.
--
-- draftValue EST TRAITE AU MEME TITRE que value : une section modifiee mais non
-- encore publiee conserve son brouillon francais, et le flux brouillon/publie
-- continue de fonctionner a l'identique.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.localize_setting(payload jsonb, field text)
RETURNS jsonb AS $$
BEGIN
  -- Rien a convertir : champ absent, deja un objet { fr, ar }, ou null.
  IF payload IS NULL OR NOT (payload ? field) THEN
    RETURN payload;
  END IF;
  IF jsonb_typeof(payload -> field) <> 'string' THEN
    RETURN payload;
  END IF;

  RETURN jsonb_set(payload, ARRAY[field], jsonb_build_object('fr', payload ->> field));
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------- organisation
UPDATE "SiteSettings" SET
  "value" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting(
        pg_temp.localize_setting("value", 'tagline'), 'about'), 'mission'), 'quote'),
  "draftValue" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting(
        pg_temp.localize_setting("draftValue", 'tagline'), 'about'), 'mission'), 'quote')
WHERE "key" = 'organization';

-- -------------------------------------------------------------------- contact
UPDATE "SiteSettings" SET
  "value" = pg_temp.localize_setting("value", 'address'),
  "draftValue" = pg_temp.localize_setting("draftValue", 'address')
WHERE "key" = 'global_contact';

-- ------------------------------------------------------------------- accueil
UPDATE "SiteSettings" SET
  "value" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting(
        pg_temp.localize_setting(
          pg_temp.localize_setting("value", 'heroTitle'), 'heroSubtitle'),
        'heroBadgeTitle'), 'heroBadgeSubtitle'), 'ctaQuote'),
  "draftValue" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting(
        pg_temp.localize_setting(
          pg_temp.localize_setting("draftValue", 'heroTitle'), 'heroSubtitle'),
        'heroBadgeTitle'), 'heroBadgeSubtitle'), 'ctaQuote')
WHERE "key" = 'homepage';

-- ------------------------------------------------------------------------ seo
UPDATE "SiteSettings" SET
  "value" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting("value", 'title'), 'description'), 'keywords'),
  "draftValue" = pg_temp.localize_setting(
    pg_temp.localize_setting(
      pg_temp.localize_setting("draftValue", 'title'), 'description'), 'keywords')
WHERE "key" = 'seo';
