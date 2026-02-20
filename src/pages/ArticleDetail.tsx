import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { NotionContent } from "@/components/articles/NotionContent";
import { getCategoryBadgeClass } from "@/components/articles/categoryBadge";
import {
  fetchNotionArticleById,
  formatPublishedDate,
  type NotionArticleDetail,
} from "@/lib/notionArticles";
import { cn } from "@/lib/utils";

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NotionArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadArticle = async () => {
      setLoading(true);
      setLoadError(null);
      setNotFound(false);

      try {
        const data = await fetchNotionArticleById(id);
        if (!isMounted) return;

        if (!data) {
          setNotFound(true);
          setArticle(null);
        } else {
          setArticle(data);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Erreur chargement article detail:", error);
        setLoadError("Impossible de charger cet article pour le moment.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadArticle();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-3xl rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour a l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || !article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h1 className="text-2xl font-heading font-bold">Article non trouve</h1>
            <p className="text-muted-foreground">
              Cet article n'est pas disponible ou n'est pas publie pour cette application.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour a l'accueil
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
        <div className="mx-auto max-w-3xl space-y-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour a l'accueil
            </Button>
          </Link>

          <Card className="overflow-hidden shadow-soft">
            <CardContent className="space-y-7 p-6 md:p-8">
              <header className="space-y-4">
                <h1 className="text-3xl font-heading font-bold leading-tight text-foreground">{article.title}</h1>

                {article.summary ? (
                  <p className="text-lg leading-relaxed text-muted-foreground">{article.summary}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {article.categories.map((category) => (
                    <Badge key={`${article.id}-${category}`} className={cn("border text-[11px]", getCategoryBadgeClass(category))}>
                      {category}
                    </Badge>
                  ))}
                </div>

                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Publie le {formatPublishedDate(article.publishedAt)}</span>
                </div>
              </header>

              {article.imageUrl ? (
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <img src={article.imageUrl} alt={article.title} className="h-64 w-full object-cover" />
                </div>
              ) : null}

              <NotionContent blocks={article.blocks} />

              <div className="border-t border-border pt-8">
                <div className="space-y-4 text-center">
                  <h3 className="text-xl font-heading font-semibold text-primary">Pret a mettre en pratique ?</h3>
                  <p className="text-muted-foreground">
                    Decouvrez nos exercices et commencez votre premiere session
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link to="/exercises">
                      <Button variant="outline">Voir les exercices</Button>
                    </Link>
                    <Link to="/timer">
                      <Button>Demarrer une session</Button>
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
