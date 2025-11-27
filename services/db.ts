

import { 
  User, Work, Step, Expense, Material, WorkPhoto, 
  PlanType, WorkStatus, StepStatus, Notification
} from '../types';
import { STANDARD_PHASES } from './standards';

// Initial Seed Data Keys
const DB_KEY = 'maos_db_v1';
const SESSION_KEY = 'maos_session_v1';

interface DbSchema {
  users: User[];
  works: Work[];
  steps: Step[];
  expenses: Expense[];
  materials: Material[];
  photos: WorkPhoto[];
  notifications: Notification[];
}

const initialDb: DbSchema = {
  users: [
    { id: '1', name: 'Usuário Demo', email: 'demo@maos.com', whatsapp: '(11) 99999-9999', plan: PlanType.MENSAL, subscriptionExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() }
  ],
  works: [],
  steps: [],
  expenses: [],
  materials: [],
  photos: [],
  notifications: []
};

// Helper to get DB
const getDb = (): DbSchema => {
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
    return initialDb;
  }
  return JSON.parse(stored);
};

// Helper to save DB
const saveDb = (db: DbSchema) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const dbService = {
  // --- Auth ---
  login: (email: string): User | null => {
    const db = getDb();
    const user = db.users.find(u => u.email === email);
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },
  
  signup: (name: string, email: string, whatsapp?: string): User => {
    const db = getDb();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      whatsapp,
      plan: PlanType.MENSAL, 
      subscriptionExpiresAt: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString() // 30 days trial/start
    };
    db.users.push(newUser);
    saveDb(db);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  updatePlan: (userId: string, plan: PlanType) => {
    const db = getDb();
    const userIdx = db.users.findIndex(u => u.id === userId);
    if (userIdx > -1) {
      db.users[userIdx].plan = plan;
      
      // Update expiration based on plan
      const now = new Date();
      const currentExpiry = new Date(db.users[userIdx].subscriptionExpiresAt || now);
      const baseDate = currentExpiry > now ? currentExpiry : now;
      
      if (plan === PlanType.MENSAL) baseDate.setMonth(baseDate.getMonth() + 1);
      if (plan === PlanType.SEMESTRAL) baseDate.setMonth(baseDate.getMonth() + 6);
      if (plan === PlanType.VITALICIO) baseDate.setFullYear(baseDate.getFullYear() + 99);
      
      db.users[userIdx].subscriptionExpiresAt = baseDate.toISOString();

      saveDb(db);
      localStorage.setItem(SESSION_KEY, JSON.stringify(db.users[userIdx]));
    }
  },

  checkSubscriptionStatus: (user: User): { isExpired: boolean, daysRemaining: number } => {
      if (!user.subscriptionExpiresAt) return { isExpired: false, daysRemaining: 30 }; // Fallback
      
      const now = new Date();
      const expiry = new Date(user.subscriptionExpiresAt);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
          isExpired: diffDays < 0,
          daysRemaining: diffDays
      };
  },

  // --- Works ---
  getWorks: (userId: string): Work[] => {
    const db = getDb();
    return db.works.filter(w => w.userId === userId);
  },

  getWorkById: (workId: string): Work | undefined => {
    const db = getDb();
    return db.works.find(w => w.id === workId);
  },

  createWork: (work: Omit<Work, 'id' | 'status'>, useStandardTemplate: boolean = false) => {
    const db = getDb();
    const newWork: Work = {
      ...work,
      id: Math.random().toString(36).substr(2, 9),
      status: WorkStatus.PLANNING,
    };
    db.works.push(newWork);
    saveDb(db);
    
    let steps: Step[] = [];

    if (useStandardTemplate) {
      // Use the library to generate phases
      let currentDateOffset = 0;
      STANDARD_PHASES.forEach((phase) => {
        phase.steps.forEach((stepName) => {
          // Estimate duration: 3 days per step
          const start = new Date(work.startDate);
          start.setDate(start.getDate() + currentDateOffset);
          
          const end = new Date(start);
          end.setDate(end.getDate() + 3);

          steps.push({
            id: Math.random().toString(36).substr(2, 9),
            workId: newWork.id,
            name: `${phase.category} - ${stepName}`,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            status: StepStatus.NOT_STARTED,
            isDelayed: false
          });
          
          // Next step starts 2 days after current (slight overlap)
          currentDateOffset += 2; 
        });
      });
    } else {
      // Simple default steps (fallback)
      const standardSteps = [
        'Aprovação de Projetos', 'Limpeza do Terreno', 'Fundação', 'Alvenaria/Estrutura', 
        'Telhado', 'Instalação Hidráulica', 'Instalação Elétrica', 'Reboco/Contrapiso', 
        'Gesso e Forro', 'Pisos e Revestimentos', 'Pintura', 'Louças e Acabamentos'
      ];
      
      steps = standardSteps.map((name, idx) => {
        const start = new Date(work.startDate);
        start.setDate(start.getDate() + (idx * 7));
        
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        return {
          id: Math.random().toString(36).substr(2, 9),
          workId: newWork.id,
          name,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          status: StepStatus.NOT_STARTED,
          isDelayed: false
        };
      });
    }
    
    db.steps.push(...steps);
    saveDb(db);

    return newWork;
  },

  deleteWork: (workId: string) => {
    const db = getDb();
    db.works = db.works.filter(w => w.id !== workId);
    db.steps = db.steps.filter(s => s.workId !== workId);
    db.expenses = db.expenses.filter(e => e.workId !== workId);
    db.materials = db.materials.filter(m => m.workId !== workId);
    db.photos = db.photos.filter(p => p.workId !== workId);
    saveDb(db);
  },

  // --- Steps ---
  getSteps: (workId: string): Step[] => {
    const db = getDb();
    const now = new Date();
    
    // Check delays on read
    return db.steps.filter(s => s.workId === workId).map(s => {
       const endDate = new Date(s.endDate);
       // Delay logic: If Not Started or In Progress AND today > endDate
       const isDelayed = (s.status !== StepStatus.COMPLETED) && (now > endDate);
       return { ...s, isDelayed };
    });
  },

  updateStep: (step: Step) => {
    const db = getDb();
    const idx = db.steps.findIndex(s => s.id === step.id);
    if (idx > -1) {
      db.steps[idx] = step;
      
      // LÓGICA INTELIGENTE DE STATUS DA OBRA
      const workSteps = db.steps.filter(s => s.workId === step.workId);
      const hasStarted = workSteps.some(s => s.status !== StepStatus.NOT_STARTED);
      const allCompleted = workSteps.length > 0 && workSteps.every(s => s.status === StepStatus.COMPLETED);
      
      const workIdx = db.works.findIndex(w => w.id === step.workId);
      
      if (workIdx > -1) {
          if (allCompleted) {
              db.works[workIdx].status = WorkStatus.COMPLETED;
          } else if (hasStarted) {
              db.works[workIdx].status = WorkStatus.IN_PROGRESS;
          } else {
              // Se nenhuma etapa começou, volta para Planejamento
              db.works[workIdx].status = WorkStatus.PLANNING;
          }
      }

      saveDb(db);
    }
  },

  addStep: (step: Omit<Step, 'id' | 'isDelayed'>) => {
    const db = getDb();
    const newStep: Step = { 
      ...step, 
      id: Math.random().toString(36).substr(2, 9),
      isDelayed: false
    };
    db.steps.push(newStep);
    
    // Trigger status update
    const workIdx = db.works.findIndex(w => w.id === step.workId);
    if (workIdx > -1 && step.status !== StepStatus.NOT_STARTED) {
         db.works[workIdx].status = WorkStatus.IN_PROGRESS;
    }

    saveDb(db);
  },

  // --- Expenses ---
  getExpenses: (workId: string): Expense[] => {
    const db = getDb();
    return db.expenses.filter(e => e.workId === workId);
  },

  addExpense: (expense: Omit<Expense, 'id'>) => {
    const db = getDb();
    db.expenses.push({ 
        ...expense, 
        id: Math.random().toString(36).substr(2, 9),
        paidAmount: expense.paidAmount ?? 0, 
        quantity: expense.quantity ?? 1,
        stepId: expense.stepId
    });
    saveDb(db);
  },

  updateExpense: (expense: Expense) => {
    const db = getDb();
    const idx = db.expenses.findIndex(e => e.id === expense.id);
    if (idx > -1) {
      db.expenses[idx] = expense;
      saveDb(db);
    }
  },

  deleteExpense: (id: string) => {
    const db = getDb();
    db.expenses = db.expenses.filter(e => e.id !== id);
    saveDb(db);
  },
  
  deleteExpensesByMaterialId: (materialId: string) => {
      const db = getDb();
      db.expenses = db.expenses.filter(e => e.relatedMaterialId !== materialId);
      saveDb(db);
  },

  // --- Materials ---
  getMaterials: (workId: string): Material[] => {
    const db = getDb();
    return db.materials.filter(m => m.workId === workId);
  },

  addMaterial: (material: Omit<Material, 'id'>) => {
    const db = getDb();
    db.materials.push({ ...material, id: Math.random().toString(36).substr(2, 9) });
    saveDb(db);
  },

  updateMaterial: (material: Material) => {
    const db = getDb();
    const idx = db.materials.findIndex(m => m.id === material.id);
    if (idx > -1) {
      db.materials[idx] = material;
      saveDb(db);
    }
  },
  
  deleteMaterial: (materialId: string) => {
      const db = getDb();
      db.materials = db.materials.filter(m => m.id !== materialId);
      saveDb(db);
  },

  // --- Photos ---
  getPhotos: (workId: string): WorkPhoto[] => {
    const db = getDb();
    return db.photos.filter(p => p.workId === workId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addPhoto: (photo: Omit<WorkPhoto, 'id'>) => {
    const db = getDb();
    db.photos.push({ ...photo, id: Math.random().toString(36).substr(2, 9) });
    saveDb(db);
  },

  deletePhoto: (id: string) => {
    const db = getDb();
    db.photos = db.photos.filter(p => p.id !== id);
    saveDb(db);
  },

  // --- Notifications ---
  getNotifications: (userId: string): Notification[] => {
      const db = getDb();
      return db.notifications.filter(n => n.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addNotification: (notification: Omit<Notification, 'id'>) => {
      const db = getDb();
      db.notifications.push({ ...notification, id: Math.random().toString(36).substr(2, 9) });
      saveDb(db);
  },

  markNotificationRead: (id: string) => {
      const db = getDb();
      const idx = db.notifications.findIndex(n => n.id === id);
      if (idx > -1) {
          db.notifications[idx].read = true;
          saveDb(db);
      }
  },
  
  markAllNotificationsRead: (userId: string) => {
      const db = getDb();
      db.notifications.forEach(n => {
          if (n.userId === userId) n.read = true;
      });
      saveDb(db);
  },

  clearNotifications: (userId: string) => {
      const db = getDb();
      db.notifications = db.notifications.filter(n => n.userId !== userId);
      saveDb(db);
  },
  
  // --- Analytics Helper ---
  calculateWorkStats: (workId: string) => {
    const db = getDb();
    const expenses = db.expenses.filter(e => e.workId === workId);
    const steps = db.steps.filter(s => s.workId === workId);
    
    // SUM PAID AMOUNTS (Real Cash Flow), if paidAmount is undefined, use amount (legacy support)
    const totalSpent = expenses.reduce((acc, curr) => acc + (curr.paidAmount ?? curr.amount), 0);
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === StepStatus.COMPLETED).length;
    
    const now = new Date();
    const delayedSteps = steps.filter(s => (s.status !== StepStatus.COMPLETED) && (new Date(s.endDate) < now)).length;
    
    return {
      totalSpent,
      progress: totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100),
      delayedSteps
    };
  }
};