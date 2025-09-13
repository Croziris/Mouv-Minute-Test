/**
 * Composant bouton pour activer/désactiver les notifications push
 * Interface non bloquante avec gestion des états
 */

import { useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertTriangle, Shield, TestTube, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushSetup } from '@/hooks/usePushSetup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
  
  const { user } = useAuth();

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
            Les notifications ne sont pas disponibles sur cet appareil.
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

  const handleTestNotification = async () => {
    if (!user || status !== 'subscribed') {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté et avoir les notifications activées pour tester.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Test en cours...",
        description: "Envoi de la notification de test.",
      });

      const { data, error } = await supabase.functions.invoke('test-push-notification', {
        body: { user_id: user.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Test envoyé !",
        description: `${data.sent_count} notification(s) de test envoyée(s). Vérifiez vos appareils.`,
      });

    } catch (error) {
      console.error('Erreur lors du test de notification:', error);
      toast({
        title: "Erreur de test",
        description: "Impossible d'envoyer la notification de test. Vérifiez votre connexion.",
        variant: "destructive",
      });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium">Notifications push</h3>
          <p className="text-sm text-muted-foreground">
            Recevez des alertes pour ne jamais manquer vos pauses actives
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleToggle}
            disabled={isDisabled}
            variant={getButtonVariant()}
            size="lg"
            className="min-w-[140px]"
          >
            {getButtonContent()}
          </Button>
          
          {status === 'subscribed' && (
            <Button
              onClick={handleTestNotification}
              variant="outline"
              size="lg"
              className="min-w-[100px]"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Tester
            </Button>
          )}
        </div>
      </div>

      {/* Messages d'état */}
      {status === 'subscribed' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Vous recevrez des rappels automatiques à la fin de vos sessions.
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

      {status === 'idle' && canUsePush && (
        <Alert variant="default">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Activez les notifications pour recevoir des rappels automatiques à la fin de vos sessions de travail.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}