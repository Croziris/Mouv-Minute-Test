-- Migration des zones d'exercices avec les nouvelles appellations
-- Mapping : épaule → bras, dos → bas du dos, trapèze → haut du dos, tronc → autre
-- nuque et jambes restent inchangés

UPDATE exercises SET zone = 'bras' WHERE zone = 'epaules';
UPDATE exercises SET zone = 'bas du dos' WHERE zone = 'dos';
UPDATE exercises SET zone = 'haut du dos' WHERE zone = 'trapezes';
UPDATE exercises SET zone = 'autre' WHERE zone = 'tronc';