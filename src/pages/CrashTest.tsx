import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { testReactInstance, logCrashTestResults } from "@/utils/crashTestUtils";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

/**
 * Page de test pour vérifier les corrections de crash
 * Accessible uniquement en développement
 */
export default function CrashTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = () => {
    setLoading(true);
    setTimeout(() => {
      const results = testReactInstance();
      setTestResults(results);
      logCrashTestResults();
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      runTests();
    }
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cette page de test n'est disponible qu'en mode développement.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Test de correction du crash React
            </CardTitle>
            <CardDescription>
              Vérification des corrections pour l'erreur "Cannot read properties of null (reading 'useRef')"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runTests} disabled={loading}>
                {loading ? 'Test en cours...' : 'Relancer les tests'}
              </Button>
            </div>

            {testResults && (
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold">Résultats des tests</h3>
                
                {Object.entries(testResults).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <Badge variant={value ? 'default' : 'destructive'} className="flex items-center gap-1">
                      {value ? (
                        <><CheckCircle className="h-3 w-3" /> OK</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> FAIL</>
                      )}
                    </Badge>
                  </div>
                ))}
                
                <div className="p-4 border-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Status Global</span>
                    <Badge 
                      variant={Object.values(testResults).every(Boolean) ? 'default' : 'destructive'}
                      className="text-sm px-3 py-1"
                    >
                      {Object.values(testResults).every(Boolean) ? '✅ TOUT FONCTIONNE' : '❌ PROBLÈMES DÉTECTÉS'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Variables de test :</strong><br/>
                <code>VITE_ENABLE_TOOLTIP={import.meta.env.VITE_ENABLE_TOOLTIP}</code><br/>
                <code>VITE_ENABLE_TIMER={import.meta.env.VITE_ENABLE_TIMER}</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}