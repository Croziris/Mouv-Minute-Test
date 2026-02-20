import { useEffect, useState } from "react";
import { ArrowRight, Heart, Clock, Target, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";

interface NotionArticle {
  id: string;
  title: string;
  summary: string;
  image_url: string;
  created_at: string;
}

const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const NOTION_DB_ID = import.meta.env.VITE_NOTION_DB_ID;

async function fetchHomeArticles(): Promise<NotionArticle[]> {
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
        page_size: 4,
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
        image_url:
          props["Image URL"]?.url ||
          page.cover?.external?.url ||
          page.cover?.file?.url ||
          "",
        created_at: page.created_time,
      };
    });
  } catch (err) {
    console.error("Erreur Notion home:", err);
    return [];
  }
}

export default function Home() {
  const [articles, setArticles] = useState<NotionArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchHomeArticles();
      setArticles(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-primary mb-4">
            Bienvenue sur Mouv'Minute
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Votre compagnon bien-être au travail conçu par un kinésithérapeute. Prenez soin de votre
            corps avec des exercices simples et des pauses régulières, directement intégrés à votre
            journée de bureau.
          </p>
        </div>

        {/* Conseil du jour — statique pour l'instant, à brancher sur Notion si besoin */}
        <Card className="bg-gradient-nature shadow-glow">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-3">
              <Lightbulb className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-xl font-heading text-primary">Conseil du jour</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg font-medium text-primary-dark mb-4">
              "Bougez 3 minutes toutes les 45 à 60 minutes"
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Des pauses actives régulières améliorent la concentration et réduisent les tensions
              musculaires accumulées pendant le travail de bureau.
            </p>
            <Link to="/exercises" className="inline-block mt-4">
              <Button className="bg-accent hover:bg-accent-light text-accent-foreground">
                Découvrir les exercices
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 3 pilliers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Prévention TMS</h3>
              <p className="text-sm text-muted-foreground">
                Réduisez les risques de troubles musculo-squelettiques
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Micro-pauses</h3>
              <p className="text-sm text-muted-foreground">Exercices de 30 secondes à 3 minutes</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Ciblé & efficace</h3>
              <p className="text-sm text-muted-foreground">
                Exercices adaptés au travail de bureau
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Articles Notion */}
        <div className="space-y-6">
          <h2 className="text-2xl font-heading font-bold text-primary text-center">
            Nos conseils bien-être
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                    <div className="h-10 bg-muted rounded w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Aucun article publié pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="text-center mt-6">
            <Link to="/archives-conseils">
              <Button variant="outline" size="lg">
                Voir toutes les archives
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CTA session */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-xl font-heading font-bold text-primary">
              Prêt à commencer votre première session ?
            </h3>
            <p className="text-muted-foreground">
              Lancez un timer de 45 minutes et recevez des rappels pour vos pauses bien-être
            </p>
            <Link to="/timer">
              <Button size="lg" className="bg-primary hover:bg-primary-dark text-primary-foreground">
                Démarrer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
