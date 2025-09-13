# Mouv'Minute PWA

Une Progressive Web App pour gérer des sessions de travail avec des pauses actives et des exercices.

## Fonctionnalités

- 🕒 Timer personnalisable pour sessions de travail
- 💪 Exercices de pause active
- 🔔 Notifications push pour rappels automatiques
- 📱 Interface PWA installable
- 👤 Authentification utilisateur
- 📊 Suivi des sessions et exercices

## Configuration des Notifications Push

### Prérequis

1. **VAPID Keys** : Générez une paire de clés VAPID pour les notifications push
2. **Configuration Supabase** : Assurez-vous que les edge functions sont déployées
3. **Service Worker** : Le fichier `public/sw.js` doit être accessible

### Variables d'environnement

Les notifications push nécessitent une clé VAPID publique configurée dans `src/hooks/usePushSetup.ts` :

```typescript
// À remplacer par votre vraie clé VAPID publique
const VAPID_PUBLIC_KEY = 'BH4dYirGhV-uuCLSmy9aALg9F8kFVgWqWJwJzK8ioxfQR1HzBdRYYXHrV-gPf5M6s_4eJ6oXVv2_b1r8f9JZjYM';
```

### Test pas-à-pas

#### 1. Desktop (Chrome/Edge/Firefox)
- ✅ Ouvrir l'application
- ✅ Cliquer sur "Activer les notifications" 
- ✅ Autoriser les notifications dans le navigateur
- ✅ Vérifier que le statut passe à "Notifications activées"
- ✅ Démarrer une session courte (1-2 min) pour tester

#### 2. Android (Chrome)
- ✅ Ouvrir l'application dans Chrome
- ✅ Cliquer sur "Activer les notifications"
- ✅ Autoriser les notifications
- ✅ Vérifier qu'il n'y a pas de freeze
- ✅ Tester avec une session courte

#### 3. iOS (16.4+) - PWA uniquement
- ✅ Ouvrir Safari
- ✅ Installer l'app PWA (Partager > Ajouter à l'écran d'accueil)
- ✅ Ouvrir l'app PWA installée
- ✅ Les notifications doivent être disponibles
- ⚠️ **Important** : Sur iOS, les notifications ne marchent QUE dans la PWA installée

#### 4. Test de timeout
- ✅ Désactiver la connexion réseau
- ✅ Essayer d'activer les notifications
- ✅ Vérifier que l'UI affiche "Timeout - Veuillez réessayer"
- ✅ L'app ne doit pas freezer

### Compatibilité

| Plateforme | Support | Notes |
|------------|---------|-------|
| Chrome Desktop | ✅ | Support complet |
| Firefox Desktop | ✅ | Support complet |
| Safari Desktop | ⚠️ | Limité, nécessite interaction utilisateur |
| Chrome Android | ✅ | Support complet |
| Safari iOS 16.4+ | ✅ | PWA installée uniquement |
| iOS < 16.4 | ❌ | Non supporté |

### Dépannage

#### "Notifications non supportées"
- Vérifiez que vous utilisez HTTPS (requis)
- Sur iOS, assurez-vous que l'app est installée comme PWA
- Vérifiez la version du navigateur

#### "Timeout lors de l'activation"
- Vérifiez votre connexion internet
- Réessayez après quelques secondes
- Vérifiez que les edge functions Supabase sont déployées

#### "Permission refusée"
- Allez dans les paramètres du navigateur
- Réautorisez les notifications pour le site
- Rechargez la page et réessayez

### Architecture

```
src/
├── hooks/
│   └── usePushSetup.ts          # Hook principal pour les notifications
├── components/
│   └── PushNotificationButton.tsx # Interface utilisateur
├── utils/
│   └── pushUtils.ts             # Utilitaires (Base64URL, compatibilité)
└── pages/
    └── Timer.tsx                # Page principale avec integration

supabase/functions/
├── save-subscription/           # Sauvegarder les abonnements push
├── delete-subscription/         # Supprimer les abonnements
└── schedule-session-notification/ # Programmer les notifications

public/
└── sw.js                       # Service Worker avec gestion push
```

### Développement

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Build de production
npm run build
```

Pour tester les notifications en développement :
1. Utilisez HTTPS (localhost ne fonctionne que partiellement)
2. Ouvrez les DevTools > Application > Service Workers
3. Surveillez les logs du Service Worker dans la console