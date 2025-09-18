import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useAuth } from './useAuth';
import type { Announcement, CreateAnnouncementInput, UserRole } from '../../../server/src/schema';

export function AnnouncementManager() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create announcement form state
  const [createForm, setCreateForm] = useState<CreateAnnouncementInput>({
    title: '',
    content: '',
    target_roles: null,
    is_urgent: false,
    expires_at: null
  });

  const allRoles: UserRole[] = ['Mayor', 'Secretary', 'Department Head'];

  const loadAnnouncements = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await trpc.announcements.getForUser.query(user.role);
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const newAnnouncement = await trpc.announcements.create.mutate({
        ...createForm,
        authorId: user.id
      });
      
      setAnnouncements((prev: Announcement[]) => [newAnnouncement, ...prev]);
      setIsCreateDialogOpen(false);
      
      // Reset form
      setCreateForm({
        title: '',
        content: '',
        target_roles: null,
        is_urgent: false,
        expires_at: null
      });
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleDeactivateAnnouncement = async (announcementId: number) => {
    if (!user) return;
    
    try {
      await trpc.announcements.deactivate.mutate({
        announcementId,
        userId: user.id
      });
      
      setAnnouncements((prev: Announcement[]) =>
        prev.map((ann: Announcement) =>
          ann.id === announcementId ? { ...ann, is_active: false } : ann
        )
      );
    } catch (error) {
      console.error('Failed to deactivate announcement:', error);
    }
  };

  const handleRoleChange = (role: UserRole, checked: boolean) => {
    setCreateForm((prev: CreateAnnouncementInput) => {
      const currentRoles = prev.target_roles || [];
      
      if (checked) {
        return {
          ...prev,
          target_roles: [...currentRoles, role]
        };
      } else {
        const newRoles = currentRoles.filter((r: UserRole) => r !== role);
        return {
          ...prev,
          target_roles: newRoles.length > 0 ? newRoles : null
        };
      }
    });
  };

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'Mayor': return 'Maire';
      case 'Secretary': return 'Secrétaire';
      case 'Department Head': return 'Chef de Service';
      default: return role;
    }
  };

  const canCreateAnnouncement = user?.role === 'Mayor' || user?.role === 'Department Head';

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📢 Annonces</h1>
          <p className="text-gray-600 mt-1">Communications officielles et informations importantes</p>
        </div>
        
        {canCreateAnnouncement && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                ➕ Nouvelle Annonce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle annonce</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre de l'annonce *</Label>
                  <Input
                    id="title"
                    value={createForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm(prev => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Contenu *</Label>
                  <Textarea
                    id="content"
                    value={createForm.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateForm(prev => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Rédigez le contenu de votre annonce..."
                    className="min-h-32"
                    required
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Public cible</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Sélectionnez les rôles qui verront cette annonce (laisser vide pour tous)
                  </p>
                  <div className="space-y-2">
                    {allRoles.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={createForm.target_roles?.includes(role) || false}
                          onCheckedChange={(checked: boolean) => handleRoleChange(role, checked)}
                        />
                        <Label htmlFor={`role-${role}`} className="text-sm font-normal">
                          {getRoleDisplayName(role)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_urgent"
                      checked={createForm.is_urgent}
                      onCheckedChange={(checked: boolean) =>
                        setCreateForm(prev => ({ ...prev, is_urgent: checked }))
                      }
                    />
                    <Label htmlFor="is_urgent">Annonce urgente</Label>
                  </div>

                  <div>
                    <Label htmlFor="expires_at">Date d'expiration</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={createForm.expires_at 
                        ? createForm.expires_at.toISOString().slice(0, 16) 
                        : ''
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm(prev => ({ 
                          ...prev, 
                          expires_at: e.target.value ? new Date(e.target.value) : null 
                        }))
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Publier l'annonce</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Announcements list */}
      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement: Announcement) => (
            <Card 
              key={announcement.id} 
              className={`${
                announcement.is_urgent && announcement.is_active 
                  ? 'border-red-300 bg-red-50' 
                  : announcement.is_active 
                    ? '' 
                    : 'opacity-60'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      <span>{announcement.title}</span>
                      {announcement.is_urgent && announcement.is_active && (
                        <Badge className="bg-red-500 text-white">🚨 Urgent</Badge>
                      )}
                      {!announcement.is_active && (
                        <Badge variant="outline" className="text-gray-500">
                          Désactivée
                        </Badge>
                      )}
                      {isExpired(announcement.expires_at) && (
                        <Badge variant="outline" className="text-orange-600">
                          Expirée
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>Publié le {announcement.created_at.toLocaleDateString('fr-FR')}</span>
                      {announcement.expires_at && (
                        <span>
                          Expire le {announcement.expires_at.toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons for authors */}
                  {announcement.author_id === user?.id && announcement.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateAnnouncement(announcement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Désactiver
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {announcement.content}
                  </div>
                </div>
                
                {announcement.target_roles && announcement.target_roles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Public cible:</span>
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_roles.map((role: UserRole) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {getRoleDisplayName(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium">Aucune annonce</h3>
            <p className="text-sm">
              {canCreateAnnouncement 
                ? 'Créez votre première annonce pour communiquer avec votre équipe'
                : 'Aucune annonce n\'est actuellement publiée'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}