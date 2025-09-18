import { useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/utils/trpc';
import { AuthContext } from './AuthContext';
import type { User } from '../../../server/src/schema';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token and validate
    const token = localStorage.getItem('auth-token');
    const userId = localStorage.getItem('user-id');
    
    if (token && userId) {
      loadCurrentUser(parseInt(userId));
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadCurrentUser = async (userId: number) => {
    try {
      const currentUser = await trpc.auth.getCurrentUser.query(userId);
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load current user:', error);
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-id');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await trpc.auth.login.mutate({ email, password });
      setUser(response.user);
      localStorage.setItem('auth-token', response.token);
      localStorage.setItem('user-id', response.user.id.toString());
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-id');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook exported in separate file to avoid fast refresh issues