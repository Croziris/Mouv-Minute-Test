/**
 * Composant pour configurer les notifications PWA
 * Affiche les informations sur le support et l'état des notifications
 */

import { useState } from 'react';
import { Bell, BellOff, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';

interface NotificationSetupProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function NotificationSetup({ enabled, onToggle }: NotificationSetupProps) {
  const {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const [isRequesting, setIsRequesting] = useState(false);

  const handleToggle = async (newEnabled: boolean) => {
    if (!isSupported) {
      toast({
        title: "Notifications non supportées",
        description: "Votre navigateur ne supporte pas les notifications.",
        variant: "destructive",
      });
      return;
    }

    if (newEnabled && !isSubscribed) {
      setIsRequesting(true);
      try {
        const success = await subscribe();
        if (success) {
          onToggle(true);
        }
      } finally {
        setIsRequesting(false);
      }
    } else if (!newEnabled && isSubscribed) {
      await unsubscribe();
      onToggle(false);
    } else {
      onToggle(newEnabled);
    }
  };

  const getNotificationStatus = () => {
    if (!isSupported) {
      return {
        icon: AlertTriangle,
        title: "Notifications non supportées",
        description: "Votre navigateur ne supporte pas les notifications push.",
        variant: "destructive" as const,
      };
    }

    if (isSubscribed && enabled) {
      return {
        icon: Bell,
        title: "Notifications activées",
        description: "Vous recevrez des rappels pour vos pauses actives.",
        variant: "default" as const,
      };
    }

    return {
      icon: BellOff,
      title: "Notifications désactivées",
      description: "Activez les notifications pour recevoir des rappels automatiques.",
      variant: "default" as const,
    };
  };

  const status = getNotificationStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 text-accent" />
            <div>
              <CardTitle className="text-base font-heading">Notifications de rappel</CardTitle>
              <CardDescription className="text-sm">
                Recevoir des alertes à la fin des sessions de travail
              </CardDescription>
            </div>
          </div>
          
          {isSupported && (
            <Switch
              checked={enabled && isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isRequesting || loading}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Alert variant={status.variant}>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {status.description}
          </AlertDescription>
        </Alert>

        {isSubscribed && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-primary font-medium mb-1">
              💡 Conseil PWA
            </p>
            <p className="text-xs text-muted-foreground">
              Installez l'app sur votre écran d'accueil pour recevoir les notifications même quand le navigateur est fermé.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}