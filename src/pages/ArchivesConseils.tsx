import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useNavigate } from "react-router-dom";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { fetchNotionArticles, type NotionArticlePreview } from "@/lib/notionArticles";

const ARTICLES_PER_PAGE = 12;

export default function ArchivesConseils() {
  const navigate = useNavigate();
  const [allArticles, setAllArticles] = useState<NotionArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadArticles = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const articles = await fetchNotionArticles();
        if (isMounted) {
          setAllArticles(articles);
          setCurrentPage(1);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erreur chargement archives:", error);
          setLoadError("Impossible de charger les archives pour le moment.");
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

  const totalPages = Math.max(1, Math.ceil(allArticles.length / ARTICLES_PER_PAGE));

  const pagedArticles = useMemo(
    () =>
      allArticles.slice(
        (currentPage - 1) * ARTICLES_PER_PAGE,
        currentPage * ARTICLES_PER_PAGE
      ),
    [allArticles, currentPage]
  );

  return (
    <Layout>
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Accueil
          </Button>
        </div>

        <div className="mb-8 space-y-4 text-center">
          <h1 className="text-3xl font-heading font-bold text-primary">Archives des conseils bien-etre</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Retrouvez tous nos conseils et articles pour ameliorer votre bien-etre au travail
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
              <div key={`skeleton-${index}`} className="overflow-hidden rounded-lg border border-border/70 bg-card">
                <div className="h-40 animate-pulse bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : pagedArticles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Aucun article disponible pour le moment.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Les articles publies pour cette application apparaitront ici automatiquement.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pagedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((value) => Math.max(value - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Precedent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((value) => Math.min(value + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Layout>
  );
}
