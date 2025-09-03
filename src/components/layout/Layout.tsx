import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-body">
      <Header />
      
      <main className="flex-1 overflow-auto">
        <div className={showBottomNav ? "pb-28" : "pb-12"}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            Droit d'auteur © 2025 CROZIER Pierre kinésithérapeute
          </p>
        </div>
      </footer>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}