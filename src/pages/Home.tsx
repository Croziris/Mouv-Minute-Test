import { ArrowRight, Clock, Heart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

const tips = [
  {
    title: "L'importance des micro-pauses",
    description: "Des pauses de 3 minutes toutes les 45-60 minutes réduisent les TMS de 40%.",
    icon: Clock,
  },
  {
    title: "Améliorer sa posture",
    description: "Une bonne posture réduit les douleurs dorsales et améliore votre productivité.",
    icon: Target,
  },
  {
    title: "Circulation sanguine",
    description: "Bouger régulièrement active la circulation et combat la sédentarité.",
    icon: Heart,
  },
];

const articles = [
  {
    title: "Pourquoi bouger au travail ?",
    description: "Les risques de la sédentarité et les bienfaits des micro-pauses actives.",
  },
  {
    title: "Prévention des TMS",
    description: "Comment éviter les troubles musculo-squelettiques au bureau.",
  },
  {
    title: "Optimiser votre poste de travail",
    description: "Ergonomie et bonnes pratiques pour un bureau adapté.",
  },
  {
    title: "Sommeil et récupération",
    description: "L'importance du repos pour votre santé et votre performance.",
  },
  {
    title: "Alimentation au bureau",
    description: "Bien manger pendant sa journée de travail.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Section hero avec conseil du jour */}
        <section className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Bienvenue sur Mouv'Minute
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Prenez soin de votre santé au travail avec des micro-pauses actives 
              et des exercices adaptés aux salariés de bureau.
            </p>
          </div>

          {/* Conseil du jour */}
          <Card className="bg-gradient-primary border-0 text-primary-foreground shadow-glow max-w-lg mx-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">💡 Conseil du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                Bougez 3 minutes toutes les 45-60 minutes pour réduire 
                les tensions et améliorer votre bien-être.
              </p>
            </CardContent>
          </Card>

          <Button 
            onClick={() => navigate("/exercises")}
            className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent font-medium"
            size="lg"
          >
            Découvrir les exercices
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </section>

        {/* Section informative */}
        <section className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-center">
            Pourquoi bouger au travail ?
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <Card key={index} className="text-center hover:shadow-soft transition-shadow duration-300">
                  <CardHeader className="pb-3">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-heading">{tip.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {tip.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Articles de prévention */}
        <section className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-center">
            Articles et conseils
          </h2>
          
          <div className="space-y-3">
            {articles.map((article, index) => (
              <Card key={index} className="hover:shadow-soft transition-all duration-300 cursor-pointer hover:bg-secondary/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-heading font-medium text-foreground">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {article.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-4 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Disclaimer médical */}
        <section className="text-center">
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            ⚕️ Cette application propose des conseils de prévention générale. 
            Elle ne remplace pas un avis médical personnalisé.
          </p>
        </section>
      </div>
    </Layout>
  );
}