import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['Mayor', 'Secretary', 'Department Head']);
export const documentCategoryEnum = pgEnum('document_category', [
  'Administrative',
  'Legal',
  'Financial',
  'Urban Planning',
  'Public Works',
  'Social Services',
  'Other'
]);
export const taskStatusEnum = pgEnum('task_status', ['Pending', 'In Progress', 'Completed', 'Cancelled']);
export const taskPriorityEnum = pgEnum('task_priority', ['Low', 'Medium', 'High', 'Urgent']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  department: text('department'), // Nullable by default
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Documents table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  file_name: text('file_name').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  category: documentCategoryEnum('category').notNull(),
  department: text('department'), // Nullable by default
  uploaded_by: integer('uploaded_by').notNull().references(() => usersTable.id),
  is_public: boolean('is_public').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  assignee_id: integer('assignee_id').notNull().references(() => usersTable.id),
  assigned_by: integer('assigned_by').notNull().references(() => usersTable.id),
  due_date: timestamp('due_date'), // Nullable by default
  status: taskStatusEnum('status').notNull().default('Pending'),
  priority: taskPriorityEnum('priority').notNull().default('Medium'),
  department: text('department'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Announcements table
export const announcementsTable = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  author_id: integer('author_id').notNull().references(() => usersTable.id),
  target_roles: text('target_roles'), // JSON string of roles array, nullable by default
  is_urgent: boolean('is_urgent').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  expires_at: timestamp('expires_at'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  uploadedDocuments: many(documentsTable),
  assignedTasks: many(tasksTable, { relationName: 'assignedTasks' }),
  createdTasks: many(tasksTable, { relationName: 'createdTasks' }),
  announcements: many(announcementsTable),
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  uploader: one(usersTable, {
    fields: [documentsTable.uploaded_by],
    references: [usersTable.id],
  }),
}));

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  assignee: one(usersTable, {
    fields: [tasksTable.assignee_id],
    references: [usersTable.id],
    relationName: 'assignedTasks',
  }),
  creator: one(usersTable, {
    fields: [tasksTable.assigned_by],
    references: [usersTable.id],
    relationName: 'createdTasks',
  }),
}));

export const announcementsRelations = relations(announcementsTable, ({ one }) => ({
  author: one(usersTable, {
    fields: [announcementsTable.author_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type Announcement = typeof announcementsTable.$inferSelect;
export type NewAnnouncement = typeof announcementsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  documents: documentsTable,
  tasks: tasksTable,
  announcements: announcementsTable,
};