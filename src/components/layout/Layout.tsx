import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PWAInstallDialog } from "@/components/PWAInstallDialog";

interface LayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-body">
      <Header />
      
      <main className="flex-1 overflow-auto">
        <div className={showBottomNav ? "pb-32" : "pb-16"}>
          {children}
          
          {/* Footer positioned within main content, above bottom nav */}
          <footer className="mt-8 pt-6 pb-4 border-t border-border">
            <div className="container mx-auto px-4">
              <p className="text-center text-sm text-muted-foreground">
                Droit d'auteur © 2025 CROZIER Pierre Kinésithérapeute
              </p>
            </div>
          </footer>
        </div>
      </main>
      
      {showBottomNav && <BottomNav />}
      
      {/* Installation PWA */}
      <PWAInstallBanner />
      <PWAInstallDialog />
    </div>
  );
}