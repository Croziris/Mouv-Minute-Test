import { useEffect, useState } from "react";
import { ArrowRight, Heart, Clock, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Article, DailyTip, dailyTip, getHomeArticles } from "@/data/mockContent";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState<DailyTip | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTip(dailyTip);
      setArticles(getHomeArticles());
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-primary mb-4">Bienvenue sur Mouv'Minute</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Votre compagnon bien-etre au travail concu par un kinesitherapeute. Prenez soin de votre
            corps avec des exercices simples et des pauses regulieres, directement integres a votre
            journee de bureau.
          </p>
        </div>

        <Card className="bg-gradient-nature shadow-glow">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-3">
              <Lightbulb className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-xl font-heading text-primary">Conseil du jour</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg font-medium text-primary-dark mb-4">
              "{tip?.title || "Bougez 3 minutes toutes les 45 a 60 minutes"}"
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {tip?.content ||
                "Des pauses actives regulieres ameliorent la concentration et reduisent les tensions."}
            </p>
            <Link to="/exercises" className="inline-block mt-4">
              <Button className="bg-accent hover:bg-accent-light text-accent-foreground">
                Decouvrir les exercices
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Prevention TMS</h3>
              <p className="text-sm text-muted-foreground">Reduisez les risques de troubles musculosquelettiques</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Micro-pauses</h3>
              <p className="text-sm text-muted-foreground">Exercices de 30 secondes a 3 minutes</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">Cible efficace</h3>
              <p className="text-sm text-muted-foreground">Exercices adaptes au travail de bureau</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-heading font-bold text-primary text-center">Nos conseils bien-etre</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="h-10 bg-muted rounded w-32"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <Link key={article.id} to={`/article/${article.id}`}>
                  <Card className="hover:shadow-soft transition-shadow cursor-pointer group h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-heading group-hover:text-primary transition-colors">
                        {article.title}
                      </CardTitle>
                      <CardDescription>{article.summary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {article.content.substring(0, 150)}...
                      </p>
                      <Button variant="ghost" className="group-hover:text-primary">
                        Lire l'article
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-6">
            <Link to="/archives-conseils">
              <Button variant="outline" size="lg">
                Voir toutes les archives de conseils bien-etre
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-xl font-heading font-bold text-primary">Pret a commencer votre premiere session ?</h3>
            <p className="text-muted-foreground">
              Lancez un timer de 45 minutes et recevez des rappels pour vos pauses bien-etre
            </p>
            <Link to="/timer">
              <Button size="lg" className="bg-primary hover:bg-primary-dark text-primary-foreground">
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
