import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '../useAuth';
import { useState } from 'react';

interface TopBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const getViewTitle = (view: string) => {
    switch (view) {
      case 'dashboard': return { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' };
      case 'tasks': return { title: 'Gestion des tâches', subtitle: 'Organisez votre travail quotidien' };
      case 'documents': return { title: 'Centre documentaire', subtitle: 'Accédez à tous vos documents' };
      case 'announcements': return { title: 'Annonces officielles', subtitle: 'Communications de la mairie' };
      case 'users': return { title: 'Gestion des utilisateurs', subtitle: 'Administration des comptes' };
      case 'profile': return { title: 'Mon profil', subtitle: 'Gérez vos informations personnelles' };
      default: return { title: 'Intranet Mairie', subtitle: 'Bienvenue dans votre espace de travail' };
    }
  };

  const { title, subtitle } = getViewTitle(currentView);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Mayor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Secretary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Department Head': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page title and breadcrumb */}
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <span>Intranet</span>
            <span>/</span>
            <span className="text-gray-900">{title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        {/* Search and actions */}
        <div className="flex items-center space-x-4">
          {/* Search bar */}
          <div className="hidden md:block">
            <Input
              type="search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <span className="text-lg">🔔</span>
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
              3
            </Badge>
          </Button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </div>
              <Badge className={getRoleColor(user?.role || '')} variant="outline">
                {user?.role}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-1">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-medium">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-medium">{user?.first_name} {user?.last_name}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <Badge className={getRoleColor(user?.role || '')} variant="outline">
                        {user?.role}
                      </Badge>
                      {user?.department && (
                        <div className="text-xs text-gray-400 mt-1">{user.department}</div>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewChange('profile')} className="cursor-pointer">
                  <span className="mr-2">👤</span>
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('dashboard')} className="cursor-pointer">
                  <span className="mr-2">📊</span>
                  Tableau de bord
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <span className="mr-2">⚙️</span>
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <span className="mr-2">❓</span>
                  Aide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={logout} 
                  className="text-red-600 cursor-pointer focus:text-red-600"
                >
                  <span className="mr-2">🚪</span>
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}