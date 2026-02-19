import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { getArticleById } from "@/data/mockContent";

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const article = useMemo(() => (id ? getArticleById(id) : null), [id]);

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-2xl font-heading font-bold">Article non trouve</h1>
            <p className="text-muted-foreground">Cet article n'existe pas ou a ete supprime.</p>
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
        <div className="max-w-3xl mx-auto space-y-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour a l'accueil
            </Button>
          </Link>

          <Card className="shadow-soft">
            <CardContent className="p-8">
              <div className="space-y-4 mb-8">
                <h1 className="text-3xl font-heading font-bold text-foreground">{article.title}</h1>

                {article.summary && <p className="text-lg text-muted-foreground leading-relaxed">{article.summary}</p>}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Publie le{" "}
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
                <div className="text-foreground leading-relaxed whitespace-pre-line">{article.content}</div>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-heading font-semibold text-primary">Pret a mettre en pratique ?</h3>
                  <p className="text-muted-foreground">Decouvrez nos exercices et commencez votre premiere session</p>
                  <div className="flex gap-4 justify-center">
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
