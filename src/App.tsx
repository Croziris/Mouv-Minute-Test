import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Exercises from "./pages/Exercises";
import ExerciseDetail from "./pages/ExerciseDetail";
import ArticleDetail from "./pages/ArticleDetail";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ConfirmPasswordReset from "./pages/ConfirmPasswordReset";
import NotFound from "./pages/NotFound";
import ArchivesConseils from "./pages/ArchivesConseils";
import Session from "./pages/Session";
import WorkoutPlanDetail from "./pages/WorkoutPlanDetail";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/timer" element={<Navigate to="/session" replace />} />
              <Route path="/session" element={<Session />} />
              <Route path="/session/plans/:planId" element={<WorkoutPlanDetail />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/exercises/:id" element={<ExerciseDetail />} />
              <Route path="/article/:id" element={<ArticleDetail />} />
              <Route path="/archives-conseils" element={<ArchivesConseils />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/confirm-password-reset" element={<ConfirmPasswordReset />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
