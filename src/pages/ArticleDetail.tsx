import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";

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

async function fetchArticleById(pageId: string): Promise<NotionArticle | null> {
  try {
    // Récupérer les propriétés de la page
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });
    const page = await pageRes.json();
    const props = page.properties;

    // Récupérer le contenu (blocks) de la page
    const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });
    const blocksData = await blocksRes.json();

    // Convertir les blocks en texte simple
    const content = blocksData.results
      .map((block: any) => {
        const type = block.type;
        const richText = block[type]?.rich_text;
        if (!richText) return "";
        return richText.map((t: any) => t.plain_text).join("") + "\n";
      })
      .join("\n")
      .trim();

    return {
      id: page.id,
      title: props.Titre?.title?.[0]?.plain_text || props.Name?.title?.[0]?.plain_text || "Sans titre",
      summary: props.Résumé?.rich_text?.[0]?.plain_text || "",
      content,
      image_url: props["Image URL"]?.url || page.cover?.external?.url || page.cover?.file?.url || "",
      created_at: page.created_time,
    };
  } catch (err) {
    console.error("Erreur Notion article:", err);
    return null;
  }
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NotionArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const data = await fetchArticleById(id);
      if (!data) setNotFound(true);
      else setArticle(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (notFound || !article) {
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
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>

          <Card className="shadow-soft">
            <CardContent className="p-8">
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
                    Publié le{" "}
                    {new Date(article.created_at).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {article.image_url && (
                <div className="mb-8">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-64 object-cover rounded-lg shadow-soft"
                  />
                </div>
              )}

              <div className="prose prose-lg max-w-none">
                <div className="text-foreground leading-relaxed whitespace-pre-line">
                  {article.content}
                </div>
              </div>

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
                      <Button variant="outline">Voir les exercices</Button>
                    </Link>
                    <Link to="/timer">
                      <Button>Démarrer une session</Button>
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
