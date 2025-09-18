import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { useAuth } from './useAuth';
import type { DashboardData } from '../../../server/src/schema';

interface DashboardProps {
  onViewChange: (view: string) => void;
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await trpc.dashboard.getData.query(user.id);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {user?.first_name} ! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              Voici un aperçu de votre espace de travail
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              ✅ Tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.task_summary.total || 0}
            </div>
            <p className="text-blue-100 text-sm">
              {dashboardData?.task_summary.pending || 0} en attente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              📁 Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.recent_documents.length || 0}
            </div>
            <p className="text-green-100 text-sm">récents</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              📢 Annonces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.announcements.length || 0}
            </div>
            <p className="text-purple-100 text-sm">actives</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              👥 Département
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {user?.department || 'Non défini'}
            </div>
            <p className="text-orange-100 text-sm">
              {user?.role}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📋 Mes tâches en cours</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewChange('tasks')}
              >
                Voir tout
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.pending_tasks && dashboardData.pending_tasks.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pending_tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 truncate">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Échéance: {task.due_date.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex items-center space-x-2">
                      <Badge variant={task.priority === 'High' || task.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>✨ Aucune tâche en cours</p>
                <p className="text-sm">Excellent travail !</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📢 Annonces</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewChange('announcements')}
              >
                Voir tout
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.announcements && dashboardData.announcements.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      {announcement.is_urgent && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {announcement.created_at.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>📭 Aucune annonce récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📁 Documents récents</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewChange('documents')}
            >
              Voir tout
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.recent_documents && dashboardData.recent_documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.recent_documents.slice(0, 6).map((document) => (
                <div key={document.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">
                        {document.mime_type.includes('pdf') ? '📄' : 
                         document.mime_type.includes('image') ? '🖼️' : 
                         document.mime_type.includes('word') ? '📝' : '📎'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{document.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {document.category}
                        </Badge>
                        {document.department && (
                          <Badge variant="secondary" className="text-xs">
                            {document.department}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {document.created_at.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>📂 Aucun document récent</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}