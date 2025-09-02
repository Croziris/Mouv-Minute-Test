import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'article.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-4 w-3/4"></div>
              <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
              <div className="h-64 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-2xl font-heading font-bold">Article non trouvé</h1>
            <p className="text-muted-foreground">Cet article n'existe pas ou a été supprimé.</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Bouton retour */}
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>

          <Card className="shadow-soft">
            <CardContent className="p-8">
              {/* En-tête de l'article */}
              <div className="space-y-4 mb-8">
                <h1 className="text-3xl font-heading font-bold text-foreground">
                  {article.title}
                </h1>
                
                {article.summary && (
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Publié le {new Date(article.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Image de l'article si présente */}
              {article.image_url && (
                <div className="mb-8">
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className="w-full h-64 object-cover rounded-lg shadow-soft"
                  />
                </div>
              )}

              {/* Contenu de l'article */}
              <div className="prose prose-lg max-w-none">
                <div className="text-foreground leading-relaxed whitespace-pre-line">
                  {article.content}
                </div>
              </div>

              {/* Call-to-action */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-heading font-semibold text-primary">
                    Prêt à mettre en pratique ?
                  </h3>
                  <p className="text-muted-foreground">
                    Découvrez nos exercices et commencez votre première session
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link to="/exercises">
                      <Button variant="outline">
                        Voir les exercices
                      </Button>
                    </Link>
                    <Link to="/timer">
                      <Button>
                        Démarrer une session
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}