import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  loginInputSchema,
  createUserInputSchema,
  uploadDocumentInputSchema,
  createTaskInputSchema,
  updateTaskStatusInputSchema,
  createAnnouncementInputSchema,
  userRoleSchema,
  taskStatusSchema,
  documentCategorySchema
} from './schema';

// Handler imports
import { loginUser, registerUser, getCurrentUser } from './handlers/auth';
import { getAllUsers, getUsersByRole, getUsersByDepartment, updateUserStatus } from './handlers/users';
import { 
  uploadDocument, 
  getAllDocuments, 
  getDocumentsByCategory, 
  getDocumentsByDepartment, 
  searchDocuments, 
  getDocumentById 
} from './handlers/documents';
import { 
  createTask, 
  getTasksAssignedToUser, 
  getTasksCreatedByUser, 
  getTasksByStatus, 
  getTasksByDepartment, 
  updateTaskStatus, 
  getOverdueTasks 
} from './handlers/tasks';
import { 
  createAnnouncement, 
  getAnnouncementsForUser, 
  getAllAnnouncements, 
  getUrgentAnnouncements, 
  deactivateAnnouncement 
} from './handlers/announcements';
import { getDashboardData, getQuickStats } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => loginUser(input)),
    
    register: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => registerUser(input)),
    
    getCurrentUser: publicProcedure
      .input(z.number())
      .query(({ input }) => getCurrentUser(input)),
  }),

  // User management routes
  users: router({
    getAll: publicProcedure
      .query(() => getAllUsers()),
    
    getByRole: publicProcedure
      .input(userRoleSchema)
      .query(({ input }) => getUsersByRole(input)),
    
    getByDepartment: publicProcedure
      .input(z.string())
      .query(({ input }) => getUsersByDepartment(input)),
    
    updateStatus: publicProcedure
      .input(z.object({
        userId: z.number(),
        isActive: z.boolean()
      }))
      .mutation(({ input }) => updateUserStatus(input.userId, input.isActive)),
  }),

  // Document management routes
  documents: router({
    upload: publicProcedure
      .input(uploadDocumentInputSchema.extend({
        uploadedBy: z.number()
      }))
      .mutation(({ input }) => {
        const { uploadedBy, ...documentInput } = input;
        return uploadDocument(documentInput, uploadedBy);
      }),
    
    getAll: publicProcedure
      .input(z.number())
      .query(({ input }) => getAllDocuments(input)),
    
    getByCategory: publicProcedure
      .input(z.object({
        category: documentCategorySchema,
        userId: z.number()
      }))
      .query(({ input }) => getDocumentsByCategory(input.category, input.userId)),
    
    getByDepartment: publicProcedure
      .input(z.object({
        department: z.string(),
        userId: z.number()
      }))
      .query(({ input }) => getDocumentsByDepartment(input.department, input.userId)),
    
    search: publicProcedure
      .input(z.object({
        query: z.string(),
        userId: z.number()
      }))
      .query(({ input }) => searchDocuments(input.query, input.userId)),
    
    getById: publicProcedure
      .input(z.object({
        documentId: z.number(),
        userId: z.number()
      }))
      .query(({ input }) => getDocumentById(input.documentId, input.userId)),
  }),

  // Task management routes
  tasks: router({
    create: publicProcedure
      .input(createTaskInputSchema.extend({
        assignedBy: z.number()
      }))
      .mutation(({ input }) => {
        const { assignedBy, ...taskInput } = input;
        return createTask(taskInput, assignedBy);
      }),
    
    getAssignedToUser: publicProcedure
      .input(z.number())
      .query(({ input }) => getTasksAssignedToUser(input)),
    
    getCreatedByUser: publicProcedure
      .input(z.number())
      .query(({ input }) => getTasksCreatedByUser(input)),
    
    getByStatus: publicProcedure
      .input(z.object({
        status: taskStatusSchema,
        userId: z.number()
      }))
      .query(({ input }) => getTasksByStatus(input.status, input.userId)),
    
    getByDepartment: publicProcedure
      .input(z.object({
        department: z.string(),
        userId: z.number()
      }))
      .query(({ input }) => getTasksByDepartment(input.department, input.userId)),
    
    updateStatus: publicProcedure
      .input(updateTaskStatusInputSchema.extend({
        userId: z.number()
      }))
      .mutation(({ input }) => {
        const { userId, ...statusInput } = input;
        return updateTaskStatus(statusInput, userId);
      }),
    
    getOverdue: publicProcedure
      .input(z.number())
      .query(({ input }) => getOverdueTasks(input)),
  }),

  // Announcement routes
  announcements: router({
    create: publicProcedure
      .input(createAnnouncementInputSchema.extend({
        authorId: z.number()
      }))
      .mutation(({ input }) => {
        const { authorId, ...announcementInput } = input;
        return createAnnouncement(announcementInput, authorId);
      }),
    
    getForUser: publicProcedure
      .input(userRoleSchema)
      .query(({ input }) => getAnnouncementsForUser(input)),
    
    getAll: publicProcedure
      .query(() => getAllAnnouncements()),
    
    getUrgent: publicProcedure
      .input(userRoleSchema)
      .query(({ input }) => getUrgentAnnouncements(input)),
    
    deactivate: publicProcedure
      .input(z.object({
        announcementId: z.number(),
        userId: z.number()
      }))
      .mutation(({ input }) => deactivateAnnouncement(input.announcementId, input.userId)),
  }),

  // Dashboard routes
  dashboard: router({
    getData: publicProcedure
      .input(z.number())
      .query(({ input }) => getDashboardData(input)),
    
    getQuickStats: publicProcedure
      .input(z.number())
      .query(({ input }) => getQuickStats(input)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`French City Office Intranet TRPC server listening at port: ${port}`);
  console.log('Available endpoints:');
  console.log('- Authentication: auth.login, auth.register, auth.getCurrentUser');
  console.log('- Users: users.getAll, users.getByRole, users.getByDepartment, users.updateStatus');
  console.log('- Documents: documents.upload, documents.getAll, documents.getByCategory, documents.search');
  console.log('- Tasks: tasks.create, tasks.getAssignedToUser, tasks.updateStatus, tasks.getOverdue');
  console.log('- Announcements: announcements.create, announcements.getForUser, announcements.getUrgent');
  console.log('- Dashboard: dashboard.getData, dashboard.getQuickStats');
}

start();