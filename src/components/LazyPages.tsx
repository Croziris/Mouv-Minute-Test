import { lazy } from 'react';

// Lazy load des pages pour optimiser les performances
export const LazyExercises = lazy(() => import('@/pages/Exercises'));
export const LazyExerciseDetail = lazy(() => import('@/pages/ExerciseDetail'));
export const LazyArchivesConseils = lazy(() => import('@/pages/ArchivesConseils'));
export const LazyArticleDetail = lazy(() => import('@/pages/ArticleDetail'));
export const LazySession = lazy(() => import('@/pages/Session'));
export const LazyProfile = lazy(() => import('@/pages/Profile'));
export const LazyCrashTest = lazy(() => import('@/pages/CrashTest'));