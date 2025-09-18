import { useState } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/components/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/components/Dashboard';
import { DocumentManager } from '@/components/DocumentManager';
import { TaskManager } from '@/components/TaskManager';
import { AnnouncementManager } from '@/components/AnnouncementManager';
import { UserManager } from '@/components/UserManager';
import { ProfileView } from '@/components/ProfileView';

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
        return <ProfileView />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderCurrentView()}
    </MainLayout>
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