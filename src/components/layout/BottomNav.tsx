import { Home, Timer, Dumbbell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: "Accueil",
      href: "/",
      isActive: location.pathname === "/",
    },
    {
      icon: Timer,
      label: "Session",
      href: "/timer",
      isActive: location.pathname === "/timer",
      isMain: true, // Bouton principal plus gros
    },
    {
      icon: Dumbbell,
      label: "Exercices",
      href: "/exercises",
      isActive: location.pathname === "/exercises",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-200",
                item.isMain ? "relative -mt-4" : "py-2"
              )}
            >
              {item.isMain ? (
                // Bouton principal du timer - plus gros et avec un style spécial
                <div
                  className={cn(
                    "relative flex h-14 w-14 items-center justify-center rounded-full shadow-glow transition-all duration-300",
                    item.isActive
                      ? "bg-gradient-primary scale-110"
                      : "bg-primary hover:bg-primary-dark hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      item.isActive ? "text-primary-foreground" : "text-primary-foreground"
                    )}
                  />
                  {item.isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </div>
              ) : (
                // Boutons normaux (Accueil et Exercices)
                <div
                  className={cn(
                    "flex flex-col items-center justify-center space-y-1 rounded-lg px-3 py-2 transition-colors duration-200",
                    item.isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.isActive && (
                    <div className="absolute -bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </div>
              )}
              
              {item.isMain && (
                <span className="mt-1 text-xs font-medium text-foreground">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}