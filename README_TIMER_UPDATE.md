# Mouv'Minute - Mise à jour Timer et Optimisations

## 🎯 Nouvelles fonctionnalités implémentées

### 1. Timer amélioré
- **Durée par défaut** : 45 minutes
- **Presets rapides** : 30, 45, 60 minutes
- **Slider personnalisé** : 5 à 90 minutes (pas de 5 min)
- **Timer deadline-based** : Plus robuste, survit aux changements d'onglet
- **Synchronisation** : Presets ↔ Slider bidirectionnelle

### 2. UX utilisateur non connecté
- **Callout informatif** au lieu d'un bouton grisé
- **Actions claires** : "Se connecter" et "Créer un compte"
- **Message explicatif** sur l'importance de la connexion

### 3. Optimisations performances
- **Lazy loading** : Pages lourdes chargées à la demande
- **Performance monitoring** : Outils de mesure intégrés
- **Images optimisées** : `loading="lazy"` et `decoding="async"`
- **Nettoyage automatique** : Tous les intervals sont nettoyés

### 4. Nouveau logo
- **Interface** : Logo Supabase avec fallback gracieux
- **PWA** : Icônes locales générées (192px et 512px)
- **Manifest** : Mis à jour avec les nouvelles icônes

## 🚀 Configuration développeur

### Variables d'environnement
```bash
# Pour activer/désactiver le timer
VITE_ENABLE_TIMER=true   # Par défaut true
```

### Feature flag
- Si `VITE_ENABLE_TIMER=false` → Page d'information au lieu du timer
- Utile pour maintenance ou déploiements progressifs

## 🔧 Architecture technique

### Nouveau hook `useDeadlineTimer`
```typescript
const timer = useDeadlineTimer({
  onTimeUp: handleTimeUp,
});

// API disponible :
timer.start(durationMs)    // Démarre avec une durée
timer.pause()             // Met en pause
timer.resume()            // Reprend
timer.reset()             // Remet à zéro
timer.setDuration(ms)     // Change la durée
timer.remainingMs         // Temps restant
timer.isRunning          // État en cours
timer.progress           // Pourcentage (0-100)
```

### Composants ajoutés
- `Callout` : Notifications élégantes avec icônes
- `LazyPages` : Composants chargés à la demande
- `performanceUtils` : Monitoring des performances

## 📱 PWA améliorée

### Nouvelles icônes
- `public/icons/mouvminute-192.png` (192×192)
- `public/icons/mouvminute-512.png` (512×512)
- Support `maskable any` pour tous les launchers

### Manifest mis à jour
- Raccourcis vers Timer et Exercices
- Nouvelles icônes référencées
- Catégories santé et productivité

## 🧪 Tests de performance

Pour vérifier les optimisations :

1. **Console développeur** → Performance
2. **Mesures automatiques** dans la console (mode dev)
3. **Health check** disponible sur la page Timer
4. **Lazy loading** visible dans l'onglet Network

## 🔄 Migration automatique

- Pas de breaking changes
- Timer existant migre automatiquement
- Sessions en cours préservées
- Durées personnalisées maintenues

## 🚨 Sécurité et robustesse

- Guards contre `window`/`document` undefined
- Protection `try/catch` sur tous les `JSON.parse`
- Validation des durées (anti-NaN)
- Fallbacks sur toutes les API du navigateur
- ErrorBoundary sur le composant principal

---

*La mise à jour a été conçue pour être transparente et améliorer l'expérience utilisateur sans impact sur les fonctionnalités existantes.*