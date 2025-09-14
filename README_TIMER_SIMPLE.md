# Timer Résilient Simple

## Fonctionnement

Le timer utilise une **échéance fixe** (`endAt`) plutôt qu'un décompte pour rester précis même après refresh/verrouillage.

Au démarrage : `endAt = maintenant + durée` → le temps restant = `max(0, endAt - maintenant)`.

## Persistance

- **localStorage** : sauvegarde automatique de l'état (`endAt`, `durationMs`, `status`)
- **Serveur** : synchronisation optionnelle via RPC Supabase si disponible

## Changements

Pour modifier la **valeur par défaut** (45min) : éditer `durationMs: 45 * 60 * 1000` dans `useResilientTimer.ts`.