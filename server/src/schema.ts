import { z } from 'zod';

// User role enum schema
export const userRoleSchema = z.enum(['Mayor', 'Secretary', 'Department Head']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  department: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema,
  department: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for user authentication
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Document category enum schema
export const documentCategorySchema = z.enum([
  'Administrative',
  'Legal',
  'Financial',
  'Urban Planning',
  'Public Works',
  'Social Services',
  'Other'
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

// Document schema
export const documentSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  category: documentCategorySchema,
  department: z.string().nullable(),
  uploaded_by: z.number(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

// Input schema for uploading documents
export const uploadDocumentInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string(),
  category: documentCategorySchema,
  department: z.string().nullable(),
  is_public: z.boolean().default(false)
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Task status enum schema
export const taskStatusSchema = z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

// Task priority enum schema
export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Urgent']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  assignee_id: z.number(),
  assigned_by: z.number(),
  due_date: z.coerce.date().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  department: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  assignee_id: z.number(),
  due_date: z.coerce.date().nullable(),
  priority: taskPrioritySchema.default('Medium'),
  department: z.string().nullable()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating task status
export const updateTaskStatusInputSchema = z.object({
  id: z.number(),
  status: taskStatusSchema
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInputSchema>;

// Announcement schema
export const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  author_id: z.number(),
  target_roles: z.array(userRoleSchema).nullable(),
  is_urgent: z.boolean(),
  is_active: z.boolean(),
  expires_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Announcement = z.infer<typeof announcementSchema>;

// Input schema for creating announcements
export const createAnnouncementInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  target_roles: z.array(userRoleSchema).nullable(),
  is_urgent: z.boolean().default(false),
  expires_at: z.coerce.date().nullable()
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  user: userSchema,
  announcements: z.array(announcementSchema),
  pending_tasks: z.array(taskSchema),
  recent_documents: z.array(documentSchema),
  task_summary: z.object({
    total: z.number(),
    pending: z.number(),
    in_progress: z.number(),
    completed: z.number()
  })
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;