import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPublishedDate, type NotionArticlePreview } from "@/lib/notionArticles";
import { cn } from "@/lib/utils";
import { getCategoryBadgeClass } from "./categoryBadge";

interface ArticleCardProps {
  article: NotionArticlePreview;
  className?: string;
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  return (
    <Link to={`/article/${article.id}`} className={cn("block h-full", className)}>
      <Card className="group flex h-full flex-col overflow-hidden border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft">
        <div className="relative h-40 w-full overflow-hidden bg-gradient-nature">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-primary/80">
              Conseil Mouv Minute
            </div>
          )}
        </div>

        <CardHeader className="space-y-3 p-4 pb-2">
          <CardTitle className="text-base font-heading leading-snug text-foreground transition-colors group-hover:text-primary">
            {article.title}
          </CardTitle>

          {article.summary ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
          ) : null}

          {article.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {article.categories.map((category) => (
                <Badge key={`${article.id}-${category}`} className={cn("border text-[11px]", getCategoryBadgeClass(category))}>
                  {category}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="mt-auto p-4 pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatPublishedDate(article.publishedAt)}
            </span>

            <span className="inline-flex items-center gap-1 font-medium text-primary">
              Lire
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
