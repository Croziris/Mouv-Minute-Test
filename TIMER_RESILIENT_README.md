# Timer Résilient & Notifications Push

## Objectif

Ce système implémente un **timer résilient** qui survit aux verrouillages de téléphone, changements d'onglet et fermetures d'application, ainsi qu'un **système de notifications push** robuste pour Android.

## Fonctionnalités

### ⏱️ Timer Résilient

- **Source de vérité serveur** : L'échéance (`endAt`) est stockée côté serveur
- **Synchronisation automatique** : Au retour de veille/arrière-plan, le timer se resynchronise
- **Économie de batterie** : Pas d'interval en arrière-plan, uniquement quand l'onglet est visible
- **Persistance** : Survive aux refreshs de page et fermetures

### 📱 Notifications Push

- **Test device courant** : Bouton pour tester sur l'appareil exact
- **Compatibilité Android** : Gestion spécifique des PWA Android
- **VAPID robuste** : Clés publique/privée correctement configurées
- **Service Worker** : Toujours affiche la notification (requis Android)

## Architecture

### Backend (Supabase)

**Tables:**
- `active_timers` : État des timers (échéance, pause, etc.)
- `session_notifications` : Notifications programmées
- `push_subscriptions` : Abonnements push par device

**RPC Functions:**
- `start_timer(duration_ms, session_id)` : Démarre un timer
- `get_active_timer()` : Récupère l'état courant
- `stop_timer()` : Arrête le timer
- `pause_timer()` / `resume_timer()` : Gestion pause/reprise

**Edge Functions:**
- `send-push-test-for-current-device` : Test notification device courant

### Frontend

**Composants:**
- `ResilientTimer` : Timer avec UI identique à `BasicTimer`
- `PushNotificationButton` : Activation et test des notifications

**Hooks:**
- `useResilientTimer` : Logique timer résiliente
- `usePushSetup` : Gestion notifications push

## Configuration

### Variables d'environnement

```env
VITE_VAPID_PUBLIC_KEY=BCjTFzjS8Lw9VhjY1K4uQzrx6_RDQ9ZVaIo5DgShHV8t1dvP4rTuMHbhgRz6nS2_7qVGPqAzR8-2uxY1g3eKzZ8
```

### Secrets Supabase

- `VAPID_PRIVATE_KEY` : Clé privée VAPID pour l'envoi
- `VAPID_PUBLIC_KEY` : Clé publique VAPID (même que .env)

## Tests d'acceptation

### 🔋 Timer Résilient

1. **Test verrouillage mobile:**
   ```
   ✓ Lancer timer 5 min
   ✓ Verrouiller téléphone 5 min
   ✓ Déverrouiller → timer terminé (≤ quelques secondes restantes)
   ```

2. **Test refresh page:**
   ```
   ✓ Lancer timer 3 min
   ✓ Attendre 1 min → refresh page
   ✓ Timer reprend à ~2 min restantes
   ```

3. **Test changement d'onglet:**
   ```
   ✓ Lancer timer 2 min
   ✓ Changer d'onglet 1 min
   ✓ Revenir → timer à ~1 min restante
   ```

### 📱 Notifications Push

1. **Test activation Android:**
   ```
   ✓ Cliquer "Activer les notifications"
   ✓ Accepter la permission
   ✓ Message "Notifications activées" affiché
   ```

2. **Test notification device courant:**
   ```
   ✓ Cliquer "Tester notification sur cet appareil"
   ✓ Toast "Test en cours..."
   ✓ Notification reçue immédiatement sur le téléphone
   ✓ Toast "Test envoyé !" avec device type
   ```

3. **Test erreurs:**
   ```
   ✓ Si pas abonné → "Active d'abord les notifications"
   ✓ Si erreur VAPID → message d'erreur lisible
   ```

## Débogage

### Problèmes courants

**Timer se "bloque" en arrière-plan:**
- Vérifier que `get_active_timer` retourne bien `server_now`
- Confirmer que `visibilitychange` déclenche `syncWithServer()`

**Notifications pas reçues Android:**
- Vérifier clés VAPID dans secrets Supabase
- Confirmer que SW appelle `showNotification()`
- Tester avec `send-push-test-for-current-device`

**Erreur "applicationServerKey not valid":**
- Vérifier format Base64URL de la clé publique VAPID
- Confirmer que `base64UrlToUint8Array()` fonctionne

### Logs utiles

```javascript
// Dans la console navigateur
localStorage.getItem('push_subscription_id')
await navigator.serviceWorker.ready
await registration.pushManager.getSubscription()
```

## Changements effectués

1. ✅ Remplacé `BasicTimer` par `ResilientTimer`
2. ✅ Hook `useResilientTimer` utilise les RPC Supabase  
3. ✅ Ajouté `pause_timer()` et `resume_timer()` RPC
4. ✅ Bouton test notifications pour device courant
5. ✅ Edge Function `send-push-test-for-current-device`
6. ✅ Utilitaires VAPID (`base64UrlToUint8Array`)
7. ✅ Service Worker affiche toujours les notifications

## Statut

- ⏱️ **Timer résilient** : ✅ Implémenté et branché
- 📱 **Test notifications** : ✅ Device courant supporté  
- 🔒 **Sécurité** : ⚠️ Warnings mineurs (non-bloquants)
- 🎨 **UI/UX** : ✅ Design identique préservé