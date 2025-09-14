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
import { usePWA } from '@/hooks/usePWA';
import { toast } from '@/hooks/use-toast';

interface NotificationSetupProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function NotificationSetup({ enabled, onToggle }: NotificationSetupProps) {
  const {
    supportsNotifications,
    notificationPermission,
    requestNotificationPermission,
    isStandalone
  } = usePWA();

  const [isRequesting, setIsRequesting] = useState(false);

  const handleToggle = async (newEnabled: boolean) => {
    if (!supportsNotifications) {
      toast({
        title: "Notifications non supportées",
        description: "Votre navigateur ne supporte pas les notifications.",
        variant: "destructive",
      });
      return;
    }

    if (newEnabled && notificationPermission !== 'granted') {
      setIsRequesting(true);
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          onToggle(true);
        }
      } finally {
        setIsRequesting(false);
      }
    } else {
      onToggle(newEnabled);
    }
  };

  const getNotificationStatus = () => {
    if (!supportsNotifications) {
      return {
        icon: AlertTriangle,
        title: "Notifications non supportées",
        description: "Votre navigateur ne supporte pas les notifications push.",
        variant: "destructive" as const,
      };
    }

    if (notificationPermission === 'denied') {
      return {
        icon: BellOff,
        title: "Notifications bloquées",
        description: "Les notifications ont été refusées. Vous pouvez les réactiver dans les paramètres de votre navigateur.",
        variant: "destructive" as const,
      };
    }

    if (notificationPermission === 'granted' && enabled) {
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
          
          {supportsNotifications && notificationPermission !== 'denied' && (
            <Switch
              checked={enabled && notificationPermission === 'granted'}
              onCheckedChange={handleToggle}
              disabled={isRequesting}
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

        {!isStandalone && notificationPermission === 'granted' && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-primary font-medium mb-1">
              💡 Conseil PWA
            </p>
            <p className="text-xs text-muted-foreground">
              Installez l'app sur votre écran d'accueil pour recevoir les notifications même quand le navigateur est fermé.
            </p>
          </div>
        )}

        {notificationPermission === 'denied' && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast({
                  title: "Réactivation des notifications",
                  description: "Allez dans les paramètres de votre navigateur → Notifications → Autorisations pour réactiver les notifications pour ce site.",
                });
              }}
            >
              Comment réactiver ?
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}