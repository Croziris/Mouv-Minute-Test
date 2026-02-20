import { useEffect, useState } from "react";
import { ArrowRight, Heart, Clock, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { fetchNotionArticles, type NotionArticlePreview } from "@/lib/notionArticles";

const HOME_ARTICLES_LIMIT = 4;

export default function Home() {
  const [articles, setArticles] = useState<NotionArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadArticles = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const publishedArticles = await fetchNotionArticles(HOME_ARTICLES_LIMIT);
        if (isMounted) {
          setArticles(publishedArticles);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erreur chargement articles home:", error);
          setLoadError("Impossible de charger les articles pour le moment.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout>
      <div className="container mx-auto space-y-8 px-4 py-6">
        <div className="space-y-4 text-center">
          <h1 className="mb-4 text-3xl font-heading font-bold text-primary">Bienvenue sur Mouv Minute</h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Votre compagnon bien-etre au travail concu par un kinesitherapeute. Prenez soin de votre
            corps avec des exercices simples et des pauses regulieres, directement integres a votre
            journee de bureau.
          </p>
        </div>

        <Card className="bg-gradient-nature shadow-glow">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Lightbulb className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-xl font-heading text-primary">Conseil du jour</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-lg font-medium text-primary-dark">Bougez 3 minutes toutes les 45 a 60 minutes</p>
            <p className="leading-relaxed text-muted-foreground">
              Des pauses actives regulieres ameliorent la concentration et reduisent les tensions
              musculaires accumulees pendant le travail de bureau.
            </p>
            <Link to="/exercises" className="mt-4 inline-block">
              <Button className="bg-accent text-accent-foreground hover:bg-accent-light">
                Decouvrir les exercices
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="text-center transition-shadow hover:shadow-soft">
            <CardContent className="p-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-primary">Prevention TMS</h3>
              <p className="text-sm text-muted-foreground">Reduisez les risques de troubles musculo-squelettiques</p>
            </CardContent>
          </Card>

          <Card className="text-center transition-shadow hover:shadow-soft">
            <CardContent className="p-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-primary">Micro-pauses</h3>
              <p className="text-sm text-muted-foreground">Exercices de 30 secondes a 3 minutes</p>
            </CardContent>
          </Card>

          <Card className="text-center transition-shadow hover:shadow-soft">
            <CardContent className="p-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50">
                <Target className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-primary">Cible et efficace</h3>
              <p className="text-sm text-muted-foreground">Exercices adaptes au travail de bureau</p>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-6">
          <h2 className="text-center text-2xl font-heading font-bold text-primary">Nos conseils bien-etre</h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((placeholder) => (
                <Card key={placeholder} className="overflow-hidden">
                  <div className="h-40 animate-pulse bg-muted" />
                  <CardContent className="space-y-3 p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-6 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Aucun article publie pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/archives-conseils">
              <Button variant="outline" size="lg">
                Voir toutes les archives
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-8 text-center">
            <h3 className="text-xl font-heading font-bold text-primary">Pret a commencer votre premiere session ?</h3>
            <p className="text-muted-foreground">
              Lancez un timer de 45 minutes et recevez des rappels pour vos pauses bien-etre
            </p>
            <Link to="/timer">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-dark">
                Demarrer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
