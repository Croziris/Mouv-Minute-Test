import React from 'react';
import { AlertCircle, Smartphone, Clock, Battery } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Composant informatif sur les limitations des PWA
 * et les alternatives disponibles
 */
export function PWALimitations() {
  return (
    <Card className="border-info/20 bg-info/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Limitations PWA & Alternatives
        </CardTitle>
        <CardDescription>
          Comprendre les contraintes et découvrir les solutions disponibles
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Limitation principale */}
        <Alert variant="default">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Compte à rebours en temps réel :</strong> Les PWA ne peuvent pas afficher de 
            compte à rebours en direct dans les notifications système. Vous recevrez une notification 
            complète uniquement à la fin de votre session.
          </AlertDescription>
        </Alert>

        {/* Alternatives disponibles */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Alternatives disponibles :</h4>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/20 bg-accent/5">
              <Smartphone className="h-5 w-5 text-success mt-0.5" />
              <div>
                <div className="font-medium text-sm">Badge d'application</div>
                <div className="text-xs text-muted-foreground">
                  Affiche le nombre de minutes restantes sur l'icône de l'app
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/20 bg-accent/5">
              <Battery className="h-5 w-5 text-success mt-0.5" />
              <div>
                <div className="font-medium text-sm">Maintien de l'écran</div>
                <div className="text-xs text-muted-foreground">
                  Évite que votre appareil se mette en veille pendant la session
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/20 bg-accent/5">
              <Clock className="h-5 w-5 text-success mt-0.5" />
              <div>
                <div className="font-medium text-sm">Rappels à mi-parcours</div>
                <div className="text-xs text-muted-foreground">
                  Notifications intermédiaires à 50% et 75% de la session
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/20 bg-accent/5">
              <AlertCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <div className="font-medium text-sm">Notification enrichie</div>
                <div className="text-xs text-muted-foreground">
                  Actions rapides : voir exercices, relancer 5min, etc.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conseil d'installation */}
        <Alert variant="default" className="mt-4">
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>💡 Conseil :</strong> Pour la meilleure expérience, installez Mouv'Minute 
            sur votre écran d'accueil. Cela améliore les performances des notifications et 
            débloque certaines fonctionnalités avancées.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}