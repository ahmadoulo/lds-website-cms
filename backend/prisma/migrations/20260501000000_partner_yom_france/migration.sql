-- One-off content correction requested by the association: the partner that was
-- seeded as "Orange Money" is YOM France (Ya Oummata Mouhamad).
--
-- The seed only ever creates rows, so it could not see this through on a
-- database that already had the partner. Scoped to the exact seeded name and to
-- the seeded icon, so a partner an administrator has since edited is left alone.
UPDATE "Partner"
SET "name" = 'YOM France (Ya Oummata Mouhamad)',
    "icon" = 'Users'
WHERE "name" = 'Orange Money';
