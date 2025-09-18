import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { useAuth } from './useAuth';
import type { User, UserRole, CreateUserInput } from '../../../server/src/schema';

export function UserManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create user form state
  const [createForm, setCreateForm] = useState<CreateUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'Secretary',
    department: null
  });

  const allRoles: UserRole[] = ['Mayor', 'Secretary', 'Department Head'];
  const departments = [
    'Administration',
    'Finance',
    'Urbanisme',
    'Travaux Publics',
    'Services Sociaux',
    'Communication',
    'Ressources Humaines'
  ];

  const loadUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await trpc.users.getAll.query();
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const newUser = await trpc.auth.register.mutate(createForm);
      setUsers((prev: User[]) => [...prev, newUser]);
      setIsCreateDialogOpen(false);
      
      // Reset form
      setCreateForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'Secretary',
        department: null
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      await trpc.users.updateStatus.mutate({
        userId,
        isActive
      });
      
      setUsers((prev: User[]) =>
        prev.map((u: User) => u.id === userId ? { ...u, is_active: isActive } : u)
      );
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Mayor': return 'bg-purple-100 text-purple-800';
      case 'Secretary': return 'bg-blue-100 text-blue-800';
      case 'Department Head': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'Mayor': return 'Maire';
      case 'Secretary': return 'Secrétaire';
      case 'Department Head': return 'Chef de Service';
      default: return role;
    }
  };

  const filteredUsers = users.filter((u: User) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || u.department === departmentFilter;
    return matchesRole && matchesDepartment;
  });

  // Check if current user is Mayor (only mayors can access user management)
  if (user?.role !== 'Mayor') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600">
            Seuls les maires peuvent accéder à la gestion des utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Administrez les comptes utilisateurs de votre mairie</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={createForm.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm(prev => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={createForm.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm(prev => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Adresse e-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="utilisateur@mairie.fr"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Mot de passe temporaire *</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm(prev => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Au moins 8 caractères"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'utilisateur devra changer ce mot de passe lors de sa première connexion
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Rôle *</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value: UserRole) =>
                      setCreateForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayName(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="department">Département</Label>
                  <Select
                    value={createForm.department || 'none'}
                    onValueChange={(value: string) =>
                      setCreateForm(prev => ({ ...prev, department: value === 'none' ? null : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun département</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer l'utilisateur</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role-filter">Filtrer par rôle</Label>
              <Select
                value={roleFilter}
                onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {allRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="department-filter">Filtrer par département</Label>
              <Select
                value={departmentFilter}
                onValueChange={(value: string) => setDepartmentFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Liste des utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u: User) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium">{u.first_name} {u.last_name}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(u.role)}>
                        {getRoleDisplayName(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.department ? (
                        <Badge variant="outline">{u.department}</Badge>
                      ) : (
                        <span className="text-gray-400">Non défini</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={u.is_active ? "default" : "secondary"}
                        className={u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {u.created_at.toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={(checked: boolean) => 
                            handleToggleUserStatus(u.id, checked)
                          }
                          disabled={u.id === user.id} // Can't deactivate self
                        />
                        <span className="text-xs text-gray-500">
                          {u.is_active ? 'Désactiver' : 'Activer'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">👤</div>
              <p>Aucun utilisateur trouvé avec ces critères</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}