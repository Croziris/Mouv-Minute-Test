import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  created_at: string;
}

const ARTICLES_PER_PAGE = 12;

export default function ArchivesConseils() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  const fetchArticles = async () => {
    try {
      setLoading(true);

      // Get total count
      const { count, error: countError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated articles
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, summary, content, created_at')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE - 1);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ARTICLES_PER_PAGE);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
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

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link key={article.id} to={`/article/${article.id}`}>
                  <Card className="hover:shadow-soft transition-shadow cursor-pointer group h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-heading group-hover:text-primary transition-colors">
                        {article.title}
                      </CardTitle>
                      {article.summary && (
                        <CardDescription>
                          {article.summary}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" className="group-hover:text-primary p-0 h-auto">
                          Lire l'article
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}

        {articles.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun article disponible pour le moment.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}