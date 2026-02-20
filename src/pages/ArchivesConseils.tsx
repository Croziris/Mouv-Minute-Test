import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";

interface NotionArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url: string;
  created_at: string;
}

const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const NOTION_DB_ID = import.meta.env.VITE_NOTION_DB_ID;
const ARTICLES_PER_PAGE = 12;

async function fetchAllArticles(): Promise<NotionArticle[]> {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "Publié",
          checkbox: { equals: true },
        },
        sorts: [{ property: "Date", direction: "descending" }],
      }),
    });

    const data = await res.json();

    return data.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title:
          props.Titre?.title?.[0]?.plain_text ||
          props.Name?.title?.[0]?.plain_text ||
          "Sans titre",
        summary: props.Résumé?.rich_text?.[0]?.plain_text || "",
        content: props.Résumé?.rich_text?.[0]?.plain_text || "",
        image_url:
          props["Image URL"]?.url ||
          page.cover?.external?.url ||
          page.cover?.file?.url ||
          "",
        created_at: page.created_time,
      };
    });
  } catch (err) {
    console.error("Erreur Notion articles:", err);
    return [];
  }
}

export default function ArchivesConseils() {
  const navigate = useNavigate();
  const [allArticles, setAllArticles] = useState<NotionArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchAllArticles();
      setAllArticles(data);
      setLoading(false);
    };
    load();
  }, []);

  const totalPages = Math.ceil(allArticles.length / ARTICLES_PER_PAGE);
  const articles = allArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Accueil
          </Button>
        </div>

        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl font-heading font-bold text-primary">
            Archives des conseils bien-être
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Retrouvez tous nos conseils et articles pour améliorer votre bien-être au travail
          </p>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Grille articles */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.id} to={`/article/${article.id}`}>
                <Card className="hover:shadow-soft transition-shadow cursor-pointer group h-full">
                  {article.image_url && (
                    <div className="h-40 overflow-hidden rounded-t-lg">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg font-heading group-hover:text-primary transition-colors">
                      {article.title}
                    </CardTitle>
                    {article.summary && (
                      <CardDescription>{article.summary}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" className="group-hover:text-primary p-0 h-auto">
                        Lire l'article
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Aucun article */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun article disponible pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les articles publiés dans Notion apparaîtront ici automatiquement.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
