import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Timer from "./pages/Timer";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LazyExercises, LazyExerciseDetail, LazyArchivesConseils, LazyArticleDetail, LazySession, LazyProfile, LazyCrashTest } from "./components/LazyPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/session/:programId" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazySession />
            </Suspense>
          } />
          <Route path="/exercises" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyExercises />
            </Suspense>
          } />
          <Route path="/exercises/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyExerciseDetail />
            </Suspense>
          } />
          <Route path="/article/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyArticleDetail />
            </Suspense>
          } />
          <Route path="/archives-conseils" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyArchivesConseils />
            </Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyProfile />
            </Suspense>
          } />
          <Route path="/crash-test" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <LazyCrashTest />
            </Suspense>
          } />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
