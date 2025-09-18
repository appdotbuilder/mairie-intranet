import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { useAuth } from './useAuth';
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, User } from '../../../server/src/schema';

export function TaskManager() {
  const { user } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create task form state
  const [createForm, setCreateForm] = useState<CreateTaskInput>({
    title: '',
    description: null,
    assignee_id: 0,
    due_date: null,
    priority: 'Medium',
    department: user?.department || null
  });

  const taskStatuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
  const taskPriorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      const [assigned, created, users] = await Promise.all([
        trpc.tasks.getAssignedToUser.query(user.id),
        trpc.tasks.getCreatedByUser.query(user.id),
        trpc.users.getAll.query()
      ]);
      
      setAssignedTasks(assigned);
      setCreatedTasks(created);
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const newTask = await trpc.tasks.create.mutate({
        ...createForm,
        assignedBy: user.id
      });
      
      setCreatedTasks((prev: Task[]) => [newTask, ...prev]);
      setIsCreateDialogOpen(false);
      
      // Reset form
      setCreateForm({
        title: '',
        description: null,
        assignee_id: 0,
        due_date: null,
        priority: 'Medium',
        department: user.department || null
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStatusUpdate = async (taskId: number, newStatus: TaskStatus) => {
    if (!user) return;
    
    try {
      const updatedTask = await trpc.tasks.updateStatus.mutate({
        id: taskId,
        status: newStatus,
        userId: user.id
      });
      
      // Update the task in both lists
      setAssignedTasks((prev: Task[]) => 
        prev.map((task: Task) => task.id === taskId ? updatedTask : task)
      );
      setCreatedTasks((prev: Task[]) => 
        prev.map((task: Task) => task.id === taskId ? updatedTask : task)
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Low': return 'bg-gray-100 text-gray-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date() > dueDate;
  };

  const getUserName = (userId: number) => {
    const foundUser = allUsers.find((u: User) => u.id === userId);
    return foundUser ? `${foundUser.first_name} ${foundUser.last_name}` : 'Utilisateur inconnu';
  };

  const TaskCard = ({ task, showAssignee = false, showAssigner = false }: { 
    task: Task; 
    showAssignee?: boolean; 
    showAssigner?: boolean; 
  }) => (
    <Card key={task.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex items-center space-x-2">
            {isOverdue(task.due_date) && task.status !== 'Completed' && (
              <Badge className="bg-red-500 text-white">⏰ En retard</Badge>
            )}
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mt-2">{task.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusColor(task.status)}>
            {task.status}
          </Badge>
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          {task.department && (
            <Badge variant="outline">{task.department}</Badge>
          )}
        </div>

        <div className="text-sm space-y-1">
          {showAssignee && (
            <div className="flex items-center">
              <span className="font-medium mr-2">Assigné à:</span>
              <span>{getUserName(task.assignee_id)}</span>
            </div>
          )}
          {showAssigner && (
            <div className="flex items-center">
              <span className="font-medium mr-2">Créé par:</span>
              <span>{getUserName(task.assigned_by)}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center">
              <span className="font-medium mr-2">Échéance:</span>
              <span className={isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''}>
                {task.due_date.toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          <div className="flex items-center">
            <span className="font-medium mr-2">Créé le:</span>
            <span>{task.created_at.toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        {/* Status update controls */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Label className="text-sm font-medium">Statut:</Label>
          <Select
            value={task.status}
            onValueChange={(value: TaskStatus) => handleStatusUpdate(task.id, value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
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
            {assignedTasks.length} tâche{assignedTasks.length !== 1 ? 's' : ''} assignée{assignedTasks.length !== 1 ? 's' : ''} • 
            {createdTasks.length} tâche{createdTasks.length !== 1 ? 's' : ''} créée{createdTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              ➕ Nouvelle Tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle tâche</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Titre de la tâche *</Label>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Description détaillée de la tâche..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignee">Assigner à *</Label>
                  <Select
                    value={createForm.assignee_id > 0 ? createForm.assignee_id.toString() : 'none'}
                    onValueChange={(value: string) =>
                      setCreateForm(prev => ({ ...prev, assignee_id: value === 'none' ? 0 : parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choisir un utilisateur</SelectItem>
                      {allUsers.map((u: User) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.first_name} {u.last_name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={createForm.priority}
                    onValueChange={(value: TaskPriority) =>
                      setCreateForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Date d'échéance</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={createForm.due_date ? createForm.due_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm(prev => ({ 
                        ...prev, 
                        due_date: e.target.value ? new Date(e.target.value) : null 
                      }))
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="department">Département</Label>
                  <Input
                    id="department"
                    value={createForm.department || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm(prev => ({ ...prev, department: e.target.value || null }))
                    }
                    placeholder="Département (optionnel)"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer la tâche</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned" className="flex items-center space-x-2">
            <span>📥</span>
            <span>Mes tâches ({assignedTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="created" className="flex items-center space-x-2">
            <span>📤</span>
            <span>Tâches créées ({createdTasks.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedTasks.length > 0 ? (
              assignedTasks.map((task: Task) => (
                <TaskCard key={task.id} task={task} showAssigner={true} />
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-medium">Aucune tâche assignée</h3>
                <p className="text-sm">Vous n'avez actuellement aucune tâche à accomplir</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="created" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdTasks.length > 0 ? (
              createdTasks.map((task: Task) => (
                <TaskCard key={task.id} task={task} showAssignee={true} />
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium">Aucune tâche créée</h3>
                <p className="text-sm">Créez votre première tâche pour commencer</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}