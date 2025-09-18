import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../useAuth';
import { cn } from '../utils';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ currentView, onViewChange, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();

  const navigationItems = [
    { 
      id: 'dashboard', 
      label: 'Tableau de bord', 
      icon: '📊',
      description: 'Vue d\'ensemble de votre activité'
    },
    { 
      id: 'tasks', 
      label: 'Mes tâches', 
      icon: '✅',
      description: 'Gestion des tâches assignées'
    },
    { 
      id: 'documents', 
      label: 'Documents', 
      icon: '📁',
      description: 'Gestion documentaire'
    },
    { 
      id: 'announcements', 
      label: 'Annonces', 
      icon: '📢',
      description: 'Communications officielles'
    },
    ...(user?.role === 'Mayor' ? [{
      id: 'users', 
      label: 'Utilisateurs', 
      icon: '👥',
      description: 'Gestion des comptes utilisateurs'
    }] : [])
  ];

  const quickActions = [
    { id: 'new-task', label: 'Nouvelle tâche', icon: '➕' },
    { id: 'upload-doc', label: 'Upload document', icon: '📤' },
    ...(user?.role === 'Mayor' || user?.role === 'Secretary' ? [
      { id: 'new-announcement', label: 'Nouvelle annonce', icon: '📣' }
    ] : [])
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Mayor': return 'bg-purple-500';
      case 'Secretary': return 'bg-blue-500';
      case 'Department Head': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏛️</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Intranet</h1>
                <p className="text-xs text-gray-500">Mairie de France</p>
              </div>
            </div>
          )}
          {isCollapsed && <div className="text-2xl mx-auto">🏛️</div>}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="p-1 h-auto"
            >
              {isCollapsed ? '▶️' : '◀️'}
            </Button>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
            getRoleColor(user?.role || '')
          )}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-gray-500 truncate">{user?.role}</div>
              {user?.department && (
                <div className="text-xs text-gray-400 truncate">{user.department}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? 'default' : 'ghost'}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full justify-start h-auto py-3",
                isCollapsed ? "px-2" : "px-3"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && (
                <div className="ml-3 text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 font-normal">
                    {item.description}
                  </div>
                </div>
              )}
            </Button>
          ))}
        </div>

        {!isCollapsed && (
          <>
            <Separator className="my-4 mx-4" />
            
            {/* Quick Actions */}
            <div className="px-2">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions rapides
                </h3>
              </div>
              <div className="space-y-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start px-3 text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      // Handle quick actions
                      if (action.id === 'new-task') {
                        onViewChange('tasks');
                      } else if (action.id === 'upload-doc') {
                        onViewChange('documents');
                      } else if (action.id === 'new-announcement') {
                        onViewChange('announcements');
                      }
                    }}
                  >
                    <span className="mr-2">{action.icon}</span>
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        {!isCollapsed && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              v1.0 - Système interne
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}