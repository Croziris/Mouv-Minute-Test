/**
 * Composant bouton pour activer/désactiver les notifications push
 * Interface non bloquante avec gestion des états
 */

import { useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushSetup } from '@/hooks/usePushSetup';

interface PushNotificationButtonProps {
  onStatusChange?: (isActive: boolean) => void;
}

export function PushNotificationButton({ onStatusChange }: PushNotificationButtonProps) {
  const {
    canUsePush,
    status,
    error,
    requestPermissionAndSubscribe,
    unsubscribe
  } = usePushSetup();

  // Informer le parent du changement de statut
  const isActive = status === 'subscribed';
  
  useEffect(() => {
    onStatusChange?.(isActive);
  }, [isActive, onStatusChange]);

  // Si les notifications ne sont pas supportées
  if (!canUsePush) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Les notifications push ne sont pas disponibles sur cet appareil.
            {/* Aide contextuelle selon la plateforme */}
            <br />
            <span className="text-xs mt-1 block">
              💡 Sur iOS : installez l'app sur votre écran d'accueil
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleToggle = async () => {
    if (status === 'subscribed') {
      await unsubscribe();
    } else {
      await requestPermissionAndSubscribe();
    }
  };

  const isLoading = status === 'prompting' || status === 'subscribing';
  const isDisabled = isLoading;

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {status === 'prompting' ? 'Autorisation...' : 'Activation...'}
        </>
      );
    }

    if (status === 'subscribed') {
      return (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Notifications activées
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Réessayer
        </>
      );
    }

    return (
      <>
        <BellOff className="h-4 w-4 mr-2" />
        Activer les notifications
      </>
    );
  };

  const getButtonVariant = () => {
    if (status === 'subscribed') return 'default';
    if (status === 'error') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleToggle}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className="w-full"
      >
        {getButtonContent()}
      </Button>

      {/* Messages d'état */}
      {status === 'subscribed' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Vous recevrez des rappels automatiques à la fin de vos sessions.
            <br />
            <span className="text-xs">
              💡 Pour recevoir les notifications même navigateur fermé, installez l'app PWA
            </span>
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Erreur :</strong> {error}
            <br />
            <span className="text-xs mt-1 block">
              Vérifiez que vous avez autorisé les notifications dans les paramètres de votre navigateur.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {status === 'idle' && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Activez les notifications pour recevoir des rappels automatiques à la fin de vos sessions de travail.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}