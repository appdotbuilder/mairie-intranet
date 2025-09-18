import { } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from './useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { user, logout } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Mayor': return 'bg-purple-100 text-purple-800';
      case 'Secretary': return 'bg-blue-100 text-blue-800';
      case 'Department Head': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'tasks', label: 'Tâches', icon: '✅' },
    { id: 'announcements', label: 'Annonces', icon: '📢' },
    ...(user?.role === 'Mayor' ? [{ id: 'users', label: 'Utilisateurs', icon: '👥' }] : [])
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏛️</span>
              <h1 className="text-xl font-bold text-gray-900">Intranet Mairie</h1>
            </div>
          </div>

          {/* Navigation items */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'default' : 'ghost'}
                onClick={() => onViewChange(item.id)}
                className="flex items-center space-x-2"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Button>
            ))}
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <Badge className={getRoleColor(user?.role || '')}>
              {user?.role}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <span className="hidden md:block">
                    {user?.first_name} {user?.last_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-medium">{user?.first_name} {user?.last_name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    {user?.department && (
                      <div className="text-sm text-gray-500">{user.department}</div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewChange('profile')}>
                  👤 Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  🚪 Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex overflow-x-auto py-2 space-x-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange(item.id)}
                className="flex items-center space-x-1 whitespace-nowrap"
              >
                <span>{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}