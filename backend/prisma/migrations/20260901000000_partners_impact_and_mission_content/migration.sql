-- ---------------------------------------------------------------------------
-- 1. Le contenu long facultatif d'un domaine d'intervention.
--    Nullable : les domaines existants continuent de s'afficher a l'identique
--    tant qu'aucun texte n'a ete redige depuis l'administration.
-- ---------------------------------------------------------------------------
-- IF NOT EXISTS parce que ce fichier doit pouvoir etre rejoue en entier : les
-- INSERT sont gardes par NOT EXISTS et les UPDATE par leur propre condition,
-- mais un ADD COLUMN nu aurait fait echouer la transaction des la premiere
-- instruction, annulant toutes les autres. docker-entrypoint.sh marque alors la
-- migration comme appliquee et passe a la suite : les donnees seraient perdues
-- sans le moindre message.
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "content" JSONB;

-- ---------------------------------------------------------------------------
-- 2. Les cinq partenaires demandes par l'association.
--
--    Deux gardes, chacune pour une raison differente :
--      * EXISTS (SELECT 1 FROM "Partner") : sur une base VIERGE la migration
--        s'execute AVANT le seed, et le seed s'auto-annule des que la table
--        n'est pas vide. Sans cette garde, une installation neuve repartirait
--        avec ces cinq lignes seules et perdrait les trois partenaires
--        historiques. C'est le seed qui fait autorite sur une base vierge.
--      * NOT EXISTS (... WHERE "name" = ...) : la migration peut etre rejouee
--        et l'association a pu saisir le partenaire elle-meme entre-temps.
--
--    "url" et "logoId" restent NULL : aucune adresse n'a ete fournie et les
--    logos se televersent depuis Administration > Partenaires. L'icone n'est
--    qu'un repli, visible tant qu'aucun logo n'est rattache.
-- ---------------------------------------------------------------------------
INSERT INTO "Partner" ("id", "name", "icon", "order", "isPublished", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.icon, v.ord, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Carrefour', 'Building2', 3),
  ('GIZ', 'Landmark', 4),
  ('Inspection d''académie (IA de Louga)', 'GraduationCap', 5),
  ('Inspections de l''Éducation et de la Formation (IEF de Louga)', 'GraduationCap', 6),
  ('Eaux et Forêts', 'TreePine', 7)
) AS v(name, icon, ord)
WHERE EXISTS (SELECT 1 FROM "Partner")
  AND NOT EXISTS (SELECT 1 FROM "Partner" p WHERE p."name" = v.name);

-- ---------------------------------------------------------------------------
-- 3. Reparation d'une icone morte.
--    Un seed anterieur ecrivait 'Mosque', qui n'existe ni dans lucide-react ni
--    dans la liste blanche : resolveIcon() retombe sur une cible generique.
-- ---------------------------------------------------------------------------
UPDATE "Partner" SET "icon" = 'Landmark', "updatedAt" = CURRENT_TIMESTAMP
WHERE "icon" = 'Mosque';

-- ---------------------------------------------------------------------------
-- 4. Pictogrammes des chiffres cles deja en base.
--    La migration 20260401000000_impact_icon a ajoute la colonne sans la
--    remplir : en production icon vaut NULL et aucun pictogramme ne s'affiche.
--
--    Le rattrapage vise UNIQUEMENT les libelles ecrits par le seed. NULL est
--    aussi le resultat du choix « Aucun pictogramme » offert par
--    l'administration : un UPDATE ... WHERE "icon" IS NULL sans filtre de
--    libelle ecraserait ce choix.
-- ---------------------------------------------------------------------------
UPDATE "ImpactStatistic" SET "icon" = 'Backpack', "updatedAt" = CURRENT_TIMESTAMP
WHERE "label"->>'fr' = 'Kits scolaires distribués' AND "icon" IS NULL;

UPDATE "ImpactStatistic" SET "icon" = 'GraduationCap', "updatedAt" = CURRENT_TIMESTAMP
WHERE "label"->>'fr' = 'Élèves accompagnés' AND "icon" IS NULL;

UPDATE "ImpactStatistic" SET "icon" = 'Stethoscope', "updatedAt" = CURRENT_TIMESTAMP
WHERE "label"->>'fr' = 'Patients soignés gratuitement' AND "icon" IS NULL;

UPDATE "ImpactStatistic" SET "icon" = 'Trees', "updatedAt" = CURRENT_TIMESTAMP
WHERE "label"->>'fr' = 'Arbres plantés' AND "icon" IS NULL;

-- ---------------------------------------------------------------------------
-- 5. « Cantines scolaires ».
--
--    Inseree NON PUBLIEE avec une valeur de 0 : le chiffre reel est une donnee
--    de terrain que personne ici ne connait, et publier un nombre invente
--    serait pire que ne rien publier. La ligne apparait dans Administration >
--    Chiffres cles, deja nommee, coloree et pictogrammee : il reste un nombre
--    a saisir et un bouton « Afficher » a cliquer.
--
--    Meme garde EXISTS que pour les partenaires, pour la meme raison : sur une
--    base vierge, c'est le seed qui fait autorite.
-- ---------------------------------------------------------------------------
INSERT INTO "ImpactStatistic" ("id", "label", "value", "color", "icon", "order", "isPublished", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  '{"fr": "Cantines scolaires", "en": "School canteens"}'::jsonb,
  0,
  '#EE7900',
  'Utensils',
  COALESCE((SELECT MAX("order") FROM "ImpactStatistic"), -1) + 1,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "ImpactStatistic")
  AND NOT EXISTS (
    SELECT 1 FROM "ImpactStatistic" s WHERE s."label"->>'fr' = 'Cantines scolaires'
  );
