import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from './useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(email, password);
    
    if (!success) {
      setError('Identifiants invalides. Veuillez réessayer.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header with French colors accent */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Intranet Mairie</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-600 via-white to-red-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">République Française</p>
          <p className="text-sm text-gray-500">Espace de travail sécurisé</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-gray-900">
              Connexion
            </CardTitle>
            <CardDescription className="text-gray-600">
              Accédez à votre espace professionnel
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.nom@mairie.fr"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Connexion en cours...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🔐</span>
                  <span>Se connecter</span>
                </div>
              )}
            </Button>
          </form>
          
          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Système informatique de la mairie
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Version 1.0 - Accès sécurisé et confidentiel
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Demo credentials helper */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg p-4 shadow-lg border border-gray-200 max-w-xs">
        <h4 className="font-medium text-gray-900 mb-2">🔑 Comptes de démonstration</h4>
        <div className="space-y-2 text-xs text-gray-600">
          <div>
            <strong>Maire:</strong> marie.dupont@mairie.fr / password123
          </div>
          <div>
            <strong>Secrétaire:</strong> jean.martin@mairie.fr / password123  
          </div>
          <div>
            <strong>Chef de Service:</strong> sophie.bernard@mairie.fr / password123
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}