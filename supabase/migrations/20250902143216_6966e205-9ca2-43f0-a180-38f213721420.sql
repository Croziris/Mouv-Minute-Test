-- Étape 1: Supprimer l'ancienne contrainte CHECK si elle existe
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_zone_check;

-- Étape 2: Ajouter la nouvelle contrainte avec les nouvelles zones
ALTER TABLE exercises ADD CONSTRAINT exercises_zone_check 
CHECK (zone IN ('nuque', 'bras', 'bas du dos', 'haut du dos', 'autre', 'jambes'));

-- Étape 3: Migrer les données existantes
UPDATE exercises SET zone = 'bras' WHERE zone = 'epaules';
UPDATE exercises SET zone = 'bas du dos' WHERE zone = 'dos';  
UPDATE exercises SET zone = 'haut du dos' WHERE zone = 'trapezes';
UPDATE exercises SET zone = 'autre' WHERE zone = 'tronc';