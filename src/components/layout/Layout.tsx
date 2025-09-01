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
        <div className={showBottomNav ? "pb-20" : "pb-4"}>
          {children}
        </div>
      </main>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}