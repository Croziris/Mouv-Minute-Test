-- Étape 1: Supprimer toute contrainte CHECK existante sur zone
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_zone_check;

-- Étape 2: Migrer les données existantes d'abord
UPDATE exercises SET zone = 'bras' WHERE zone = 'epaules';
UPDATE exercises SET zone = 'bas du dos' WHERE zone = 'dos';  
UPDATE exercises SET zone = 'haut du dos' WHERE zone = 'trapezes';
UPDATE exercises SET zone = 'autre' WHERE zone = 'tronc';

-- Étape 3: Ajouter la nouvelle contrainte après la migration
ALTER TABLE exercises ADD CONSTRAINT exercises_zone_check 
CHECK (zone IN ('nuque', 'bras', 'bas du dos', 'haut du dos', 'autre', 'jambes'));