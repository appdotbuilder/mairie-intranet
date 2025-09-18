import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import { useAuth } from './useAuth';
import type { Document, DocumentCategory, UploadDocumentInput } from '../../../server/src/schema';

export function DocumentManager() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState<Partial<UploadDocumentInput>>({
    title: '',
    description: null,
    file_name: '',
    file_path: '',
    file_size: 0,
    mime_type: '',
    category: 'Administrative',
    department: user?.department,
    is_public: false
  });

  const documentCategories: DocumentCategory[] = [
    'Administrative',
    'Legal',
    'Financial',
    'Urban Planning',
    'Public Works',
    'Social Services',
    'Other'
  ];

  const departments = [
    'Administration',
    'Finance',
    'Urbanisme',
    'Travaux Publics',
    'Services Sociaux',
    'Communication',
    'Ressources Humaines'
  ];

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    
    try {
      const docs = await trpc.documents.getAll.query(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesDepartment = departmentFilter === 'all' || doc.department === departmentFilter;
    
    return matchesSearch && matchesCategory && matchesDepartment;
  });

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      // In a real implementation, you would handle actual file upload here
      // For now, we're using placeholder values since this is a demo
      const documentData: UploadDocumentInput & { uploadedBy: number } = {
        ...uploadForm as UploadDocumentInput,
        uploadedBy: user.id
      };
      
      const newDocument = await trpc.documents.upload.mutate(documentData);
      setDocuments((prev: Document[]) => [newDocument, ...prev]);
      setIsUploadDialogOpen(false);
      
      // Reset form
      setUploadForm({
        title: '',
        description: null,
        file_name: '',
        file_path: '',
        file_size: 0,
        mime_type: '',
        category: 'Administrative',
        department: user.department,
        is_public: false
      });
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎬';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} 
            {searchQuery || categoryFilter !== 'all' || departmentFilter !== 'all' ? ' trouvé' + (filteredDocuments.length !== 1 ? 's' : '') : ''}
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              ⬆️ Nouveau Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Télécharger un nouveau document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titre du document *</Label>
                  <Input
                    id="title"
                    value={uploadForm.title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUploadForm(prev => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(value: DocumentCategory) =>
                      setUploadForm(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setUploadForm(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Description optionnelle du document..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Département</Label>
                  <Select
                    value={uploadForm.department || 'none'}
                    onValueChange={(value: string) =>
                      setUploadForm(prev => ({ ...prev, department: value === 'none' ? null : value }))
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
                
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    id="is_public"
                    checked={uploadForm.is_public}
                    onCheckedChange={(checked: boolean) =>
                      setUploadForm(prev => ({ ...prev, is_public: checked }))
                    }
                  />
                  <Label htmlFor="is_public">Document public</Label>
                </div>
              </div>

              {/* File upload simulation */}
              <div>
                <Label htmlFor="file">Fichier (simulation) *</Label>
                <Input
                  id="file"
                  type="text"
                  placeholder="nom-du-fichier.pdf (simulation)"
                  value={uploadForm.file_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const fileName = e.target.value;
                    setUploadForm(prev => ({
                      ...prev,
                      file_name: fileName,
                      file_path: `/uploads/${fileName}`,
                      file_size: 1024 * Math.floor(Math.random() * 500 + 100), // Random size
                      mime_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
                    }));
                  }}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Note: Dans cette démo, saisissez simplement un nom de fichier
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Télécharger</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Rechercher</Label>
              <Input
                id="search"
                placeholder="Titre ou description..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="category-filter">Catégorie</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value: DocumentCategory | 'all') => setCategoryFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {documentCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="department-filter">Département</Label>
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

      {/* Documents grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document: Document) => (
          <Card key={document.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getDocumentIcon(document.mime_type)}</span>
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{document.title}</CardTitle>
                  </div>
                </div>
                {document.is_public && (
                  <Badge variant="secondary" className="text-xs">Public</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {document.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{document.description}</p>
              )}
              
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {document.category}
                </Badge>
                {document.department && (
                  <Badge variant="secondary" className="text-xs">
                    {document.department}
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>Fichier: {document.file_name}</div>
                <div>Taille: {formatFileSize(document.file_size)}</div>
                <div>Ajouté: {document.created_at.toLocaleDateString('fr-FR')}</div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  👁️ Voir
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  📥 Télécharger
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📂</div>
          <h3 className="text-lg font-medium">Aucun document trouvé</h3>
          <p className="text-sm">
            {searchQuery || categoryFilter !== 'all' || departmentFilter !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Commencez par télécharger votre premier document'
            }
          </p>
        </div>
      )}
    </div>
  );
}