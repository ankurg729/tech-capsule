import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import { Layout, RequireAdmin } from './components/Layout';
import { EmptyState } from './components/ui';
import { AuditPage } from './pages/AuditPage';
import { LessonEditorRoute } from './pages/lessons/LessonEditorPage';
import { LessonsPage } from './pages/lessons/LessonsPage';
import { LoginPage } from './pages/LoginPage';
import { NewsEditorRoute } from './pages/news/NewsEditorPage';
import { NewsPage } from './pages/news/NewsPage';
import { OverviewPage } from './pages/OverviewPage';
import { PathEditorRoute } from './pages/paths/PathEditorPage';
import { PathsPage } from './pages/paths/PathsPage';
import { ReportsPage } from './pages/ReportsPage';

function NotFound() {
  return (
    <EmptyState title="Page not found">
      <Link to="/">Back to overview</Link>
    </EmptyState>
  );
}

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAdmin>
        <Layout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'lessons/new', element: <LessonEditorRoute /> },
      { path: 'lessons/:id', element: <LessonEditorRoute /> },
      { path: 'paths', element: <PathsPage /> },
      { path: 'paths/new', element: <PathEditorRoute /> },
      { path: 'paths/:id', element: <PathEditorRoute /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'news/new', element: <NewsEditorRoute /> },
      { path: 'news/:id', element: <NewsEditorRoute /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
