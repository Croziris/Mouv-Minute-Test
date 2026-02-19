import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { getAllArticles } from "@/data/mockContent";

const ARTICLES_PER_PAGE = 12;

export default function ArchivesConseils() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const allArticles = useMemo(() => getAllArticles(), []);
  const totalCount = allArticles.length;
  const totalPages = Math.ceil(totalCount / ARTICLES_PER_PAGE);
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
          <h1 className="text-3xl font-heading font-bold text-primary">Archives des conseils bien-etre</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Retrouvez tous nos conseils et articles pour ameliorer votre bien-etre au travail
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.id} to={`/article/${article.id}`}>
              <Card className="hover:shadow-soft transition-shadow cursor-pointer group h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-heading group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                  {article.summary && <CardDescription>{article.summary}</CardDescription>}
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
                      {new Date(article.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Precedent
            </Button>

            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>

            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}

        {articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun article disponible pour le moment.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
