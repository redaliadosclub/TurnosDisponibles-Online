import { 
  Business, 
  User, 
  Service, 
  Professional, 
  Appointment, 
  TimeOff, 
  Review, 
  AuditLog, 
  NotificationPayload 
} from '../types';
import { localStore } from './localStore';

class ApiService {
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.currentUser = localStore.getCurrentUser();
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  private notifyAuthChange() {
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  async login(email: string, password?: string): Promise<User> {
    const cleanEmail = email.trim();
    const user = localStore.login(cleanEmail, password || 'admin123');
    this.currentUser = user;
    this.notifyAuthChange();
    return user;
  }

  async register(data: { name: string; email: string; password?: string; role: any; phone?: string; businessName?: string }): Promise<User> {
    const user = localStore.register(data);
    this.currentUser = user;
    this.notifyAuthChange();
    return user;
  }

  async logout(): Promise<void> {
    localStore.logout();
    this.currentUser = null;
    this.notifyAuthChange();
  }

  async getCurrentUser(): Promise<User | null> {
    const user = localStore.getCurrentUser();
    this.currentUser = user;
    return user;
  }

  async getBusinesses(): Promise<Business[]> {
    return localStore.getBusinesses();
  }

  async getBusiness(id: string): Promise<Business | null> {
    return localStore.getBusiness(id) || null;
  }

  async getBusinessBySlug(slug: string): Promise<Business | null> {
    return localStore.getBusinessBySlug(slug) || null;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    return localStore.updateBusiness(id, updates);
  }

  async createBusiness(data: Omit<Business, 'id' | 'createdAt'>): Promise<Business> {
    return localStore.createBusiness(data);
  }

  async getServices(businessId: string): Promise<Service[]> {
    return localStore.getServices(businessId);
  }

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    return localStore.createService(service);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service> {
    return localStore.updateService(id, updates);
  }

  async deleteService(id: string): Promise<void> {
    localStore.deleteService(id);
  }

  async getProfessionals(businessId: string): Promise<Professional[]> {
    return localStore.getProfessionals(businessId);
  }

  async createProfessional(prof: Omit<Professional, 'id'>): Promise<Professional> {
    return localStore.createProfessional(prof);
  }

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
    return localStore.updateProfessional(id, updates);
  }

  async deleteProfessional(id: string): Promise<void> {
    localStore.deleteProfessional(id);
  }

  async getAppointments(businessId: string): Promise<Appointment[]> {
    return localStore.getAppointments(businessId);
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const list = localStore.getAppointments();
    return list.find(a => a.id === id) || null;
  }

  async createAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'bookingCode'>): Promise<Appointment> {
    return localStore.createAppointment(data);
  }

  async updateAppointmentStatus(id: string, status: any, reason?: string): Promise<Appointment> {
    return localStore.updateAppointmentStatus(id, status, reason);
  }

  async getTimeOffs(businessId: string): Promise<TimeOff[]> {
    return localStore.getTimeOffs(businessId);
  }

  async createTimeOff(timeOff: Omit<TimeOff, 'id'>): Promise<TimeOff> {
    return localStore.createTimeOff(timeOff);
  }

  async deleteTimeOff(id: string): Promise<void> {
    localStore.deleteTimeOff(id);
  }

  async getReviews(businessId: string): Promise<Review[]> {
    return localStore.getReviews(businessId);
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    return localStore.createReview(review);
  }

  async getAuditLogs(businessId: string): Promise<AuditLog[]> {
    return localStore.getAuditLogs(businessId);
  }

  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; url?: string; message: string }> {
    const text = encodeURIComponent(`Hola ${payload.customerName}, tu turno para ${payload.serviceName} el día ${payload.date} a las ${payload.time} está confirmado. Código: ${payload.bookingCode}`);
    const cleanPhone = payload.businessPhone.replace(/\D/g, '');
    return {
      success: true,
      url: `https://wa.me/${cleanPhone}?text=${text}`,
      message: 'Notificación generada',
    };
  }
}

export const api = new ApiService();
