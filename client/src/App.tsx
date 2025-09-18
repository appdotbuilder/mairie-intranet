import { useState } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/components/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { DocumentManager } from '@/components/DocumentManager';
import { TaskManager } from '@/components/TaskManager';
import { AnnouncementManager } from '@/components/AnnouncementManager';
import { UserManager } from '@/components/UserManager';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre espace de travail...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'documents':
        return <DocumentManager />;
      case 'tasks':
        return <TaskManager />;
      case 'announcements':
        return <AnnouncementManager />;
      case 'users':
        return <UserManager />;
      case 'profile':
        // Simple profile placeholder
        return (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">👤 Mon Profil</h1>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">
                  La gestion complète du profil sera implémentée dans une prochaine version.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Pour l'instant, vous pouvez utiliser les autres fonctionnalités de l'intranet.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="pb-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;