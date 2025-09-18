import { useAuth } from './useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ProfileView() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Mayor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Secretary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Department Head': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'Mayor': return 'Responsable de la direction générale de la commune';
      case 'Secretary': return 'Support administratif et coordination des services';
      case 'Department Head': return 'Responsable d\'un service municipal';
      default: return 'Utilisateur du système';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user.first_name[0]}{user.last_name[0]}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {user.first_name} {user.last_name}
                </CardTitle>
                <CardDescription className="text-lg">
                  {user.email}
                </CardDescription>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getRoleColor(user.role)} variant="outline">
                    {user.role}
                  </Badge>
                  {user.department && (
                    <Badge variant="secondary">
                      {user.department}
                    </Badge>
                  )}
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="outline">
              ✏️ Modifier le profil
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>👤</span>
              <span>Informations personnelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Prénom</label>
              <p className="text-gray-900 font-medium">{user.first_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nom de famille</label>
              <p className="text-gray-900 font-medium">{user.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Adresse e-mail</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-gray-500">Compte créé le</label>
              <p className="text-gray-900">{user.created_at.toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Dernière mise à jour</label>
              <p className="text-gray-900">{user.updated_at.toLocaleDateString('fr-FR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Professional information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🏛️</span>
              <span>Informations professionnelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Fonction</label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getRoleColor(user.role)} variant="outline">
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {getRoleDescription(user.role)}
              </p>
            </div>
            {user.department && (
              <div>
                <label className="text-sm font-medium text-gray-500">Service/Département</label>
                <p className="text-gray-900 font-medium">{user.department}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Statut du compte</label>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={user.is_active ? 'text-green-700' : 'text-red-700'}>
                  {user.is_active ? 'Compte actif' : 'Compte suspendu'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚡</span>
              <span>Actions rapides</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">🔐</span>
              Changer le mot de passe
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">🔔</span>
              Préférences de notification
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">📱</span>
              Gestion des sessions
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <span className="mr-2">📄</span>
              Exporter mes données
            </Button>
          </CardContent>
        </Card>

        {/* Security info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🔒</span>
              <span>Sécurité</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Dernière connexion</label>
              <p className="text-gray-900">Aujourd'hui à 14:30</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Sessions actives</label>
              <p className="text-gray-900">1 session (cette session)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Niveau de sécurité</label>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-700">Sécurisé</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>❓</span>
            <span>Besoin d'aide ?</span>
          </CardTitle>
          <CardDescription>
            Contactez l'administrateur système pour toute modification de profil ou problème technique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button variant="outline">
              📧 Contacter l'administrateur
            </Button>
            <Button variant="outline">
              📚 Guide d'utilisation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}