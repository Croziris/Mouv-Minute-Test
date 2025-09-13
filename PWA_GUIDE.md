# Guide PWA - Mouv'Minute

## 🚀 Progressive Web App Features

Mouv'Minute est maintenant une **Progressive Web App (PWA)** complète avec toutes les fonctionnalités modernes.

### ✅ Fonctionnalités implémentées

#### 1. **Installation native**
- 📱 Installable sur Android, iOS et Desktop
- 🎨 Icônes d'app générées (192x192, 512x512)
- 📄 Manifest.json configuré avec thème et metadata
- 🏠 Raccourcis d'app vers Timer et Exercices

#### 2. **Service Worker et Cache**
- ⚡ Cache intelligent des ressources statiques
- 🔄 Stratégie Cache-First pour assets, Network-First pour pages
- 📴 Mode hors ligne basique avec page offline.html
- 🔄 Mise à jour automatique du cache

#### 3. **Notifications Push**
- 🔔 API Web Push intégrée 
- ⚙️ Contrôles d'activation/désactivation dans le Timer
- 🎯 Notifications à la fin des sessions de travail
- 💾 Persistance des préférences utilisateur
- 🛡️ Gestion des permissions et cas d'erreur

#### 4. **Expérience utilisateur PWA**
- 🌟 Bannière d'installation contextuelle
- 📱 Détection du mode standalone
- 🔧 Hook usePWA pour toutes les fonctionnalités
- 🎨 Interface adaptée PWA vs navigateur

### 📁 Structure des fichiers

```
public/
├── manifest.json          # Configuration PWA
├── sw.js                 # Service Worker
├── icon-192.png          # Icône app 192x192
├── icon-512.png          # Icône app 512x512
└── offline.html          # Page hors ligne

src/
├── hooks/
│   └── usePWA.ts         # Hook principal PWA
├── components/
│   ├── PWAInstallBanner.tsx    # Bannière installation
│   └── NotificationSetup.tsx   # Config notifications
└── utils/
    └── pwaUtils.ts       # Utilitaires PWA
```

### 🔧 Configuration technique

#### Manifest.json
- **Nom complet** : "Mouv'Minute - Prévention santé au travail"
- **Nom court** : "Mouv'Minute"
- **Thème** : Vert kaki (#8DA47E) + Orange (#E67E22)
- **Mode d'affichage** : Standalone
- **Orientation** : Portrait prioritaire
- **Raccourcis** : Timer et Exercices

#### Service Worker
- **Cache** : mouvminute-v1.0.0
- **Stratégies** :
  - Cache First : JS, CSS, images
  - Network First : Pages HTML
  - Fallback : Page offline pour documents
- **Notifications** : Gestion complète des push
- **Sync** : Préparé pour sync en arrière-plan

### 🎯 Utilisation

#### Installation
1. **Automatique** : Bannière apparaît après 3 secondes
2. **Manuel** : Bouton navigateur ou menu "Installer Mouv'Minute"
3. **Mobile** : "Ajouter à l'écran d'accueil"

#### Notifications
1. Aller sur `/timer`
2. Activer le switch "Notifications de rappel"
3. Accepter les permissions quand demandées
4. Les notifications apparaîtront à la fin des sessions

#### Mode hors ligne
- **Automatique** : Ressources mises en cache
- **Limité** : Timer local, exercices en cache, pas de sync
- **Reconnexion** : Rechargement automatique quand en ligne

### 🔮 Fonctionnalités futures

#### Prêt pour implémentation :
- **Push notifications serveur** : Via Supabase Edge Functions
- **Sync hors ligne** : Sessions en attente
- **Mise à jour automatique** : Reload sur nouvelle version
- **Partage natif** : API Web Share
- **Raccourcis clavier** : PWA shortcuts

#### Backend Supabase Integration :
```sql
-- Table pour les abonnements push (à créer)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Edge Function exemple :
```typescript
// Envoyer notification depuis Supabase
const sendPushNotification = async (userId: string, message: string) => {
  // Récupérer les abonnements utilisateur
  // Envoyer notification via Web Push API
  // Gérer les erreurs et désabonnements
};
```

### 🛠️ Débogage PWA

#### Outils de développement :
1. **Chrome DevTools** : Application tab → Manifest, Service Workers
2. **Lighthouse** : Audit PWA automatique
3. **about://webapps** : Apps installées (Chrome)

#### Tests :
- ✅ Installation sur différents navigateurs
- ✅ Notifications avec permissions variées  
- ✅ Mode hors ligne et reconnexion
- ✅ Thème et icônes sur écran d'accueil
- ✅ Performances et cache

### 📱 Compatibilité

| Plateforme | Installation | Notifications | Cache | Notes |
|------------|-------------|---------------|-------|-------|
| Android Chrome | ✅ | ✅ | ✅ | Support complet |
| iOS Safari | ✅ | ✅ | ✅ | iOS 16+ requis |
| Desktop Chrome | ✅ | ✅ | ✅ | Notifications système |
| Desktop Edge | ✅ | ✅ | ✅ | Support complet |
| Firefox | ⚠️ | ✅ | ✅ | Installation limitée |

### 🚀 Déploiement

1. **Build** : `npm run build`
2. **HTTPS requis** : PWA nécessite SSL
3. **Headers** : Service Worker accessible depuis /
4. **CDN** : Configurer cache des assets
5. **Monitoring** : Logs des notifications et erreurs

L'application est maintenant prête pour une expérience native sur tous les appareils ! 🎉