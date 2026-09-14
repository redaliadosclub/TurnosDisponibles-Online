import {
  Business,
  Professional,
  Service,
  WorkingHours,
  TimeOff,
  Customer,
  Appointment,
  AvailabilityResponse,
  AnalyticsEvent,
  User,
} from '../types';

export interface BookingPayload {
  businessId: string;
  professionalId: string;
  serviceId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  date: string;
  startTime: string;
  notes?: string;
  paymentMethod?: 'mercadopago' | 'transfer' | 'cash';
  paymentStatus?: 'pending' | 'deposit_pending' | 'deposit_paid' | 'paid' | 'not_required';
  depositAmount?: number;
}

export interface BookingResult {
  appointment: Appointment;
  customer: Customer;
  whatsapp: {
    customerMessage: string;
    customerUrl: string;
    businessMessage: string;
    businessUrl: string;
  };
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const error: any = new Error(data.error || 'Ocurrió un error en la solicitud');
      error.code = data.code;
      error.status = res.status;
      throw error;
    }
    return data;
  }

  // Auth
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await this.request<{ user: User | null }>('/api/auth/me');
      return res.user;
    } catch {
      return null;
    }
  }

  async login(email: string, password?: string): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res.user;
  }

  async register(data: { name: string; email: string; password?: string; role: string; businessId?: string | null }): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
  }

  // Businesses
  async getBusinesses(): Promise<Business[]> {
    return this.request<Business[]>('/api/businesses');
  }

  async getAllBusinesses(): Promise<Business[]> {
    return this.getBusinesses();
  }

  async getBusinessBySlug(slug: string): Promise<Business> {
    return this.request<Business>(`/api/businesses/${slug}`);
  }

  async createBusiness(business: Omit<Business, 'id' | 'createdAt'>): Promise<Business> {
    return this.request<Business>('/api/businesses', {
      method: 'POST',
      body: JSON.stringify(business),
    });
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    return this.request<Business>(`/api/businesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async testWapi(
    businessId: string,
    data: { webhookUrl?: string; apiKey?: string; instanceId?: string; testPhone?: string }
  ): Promise<{ success: boolean; message: string; statusCode?: number; error?: string }> {
    return this.request<{ success: boolean; message: string; statusCode?: number; error?: string }>(
      `/api/businesses/${businessId}/test-wapi`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Professionals
  async getProfessionals(businessId: string): Promise<Professional[]> {
    return this.request<Professional[]>(`/api/businesses/${businessId}/professionals`);
  }

  async createProfessional(businessId: string, data: Omit<Professional, 'id' | 'businessId'>): Promise<Professional> {
    return this.request<Professional>(`/api/businesses/${businessId}/professionals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProfessional(businessId: string, id: string, data: Partial<Professional>): Promise<Professional> {
    return this.request<Professional>(`/api/businesses/${businessId}/professionals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProfessional(businessId: string, id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/businesses/${businessId}/professionals/${id}`, {
      method: 'DELETE',
    });
  }

  // Services
  async getServices(businessId: string): Promise<Service[]> {
    return this.request<Service[]>(`/api/businesses/${businessId}/services`);
  }

  async createService(businessId: string, data: Omit<Service, 'id' | 'businessId'>): Promise<Service> {
    return this.request<Service>(`/api/businesses/${businessId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(businessId: string, id: string, data: Partial<Service>): Promise<Service> {
    return this.request<Service>(`/api/businesses/${businessId}/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(businessId: string, id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/businesses/${businessId}/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Working Hours & Time Off
  async getWorkingHours(businessId: string): Promise<WorkingHours[]> {
    return this.request<WorkingHours[]>(`/api/businesses/${businessId}/working-hours`);
  }

  async updateWorkingHours(businessId: string, hours: WorkingHours[]): Promise<WorkingHours[]> {
    return this.request<WorkingHours[]>(`/api/businesses/${businessId}/working-hours`, {
      method: 'PUT',
      body: JSON.stringify(hours),
    });
  }

  async getTimeOffs(businessId: string): Promise<TimeOff[]> {
    return this.request<TimeOff[]>(`/api/businesses/${businessId}/time-offs`);
  }

  async createTimeOff(businessId: string, data: Omit<TimeOff, 'id' | 'businessId'>): Promise<TimeOff> {
    return this.request<TimeOff>(`/api/businesses/${businessId}/time-offs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeOff(businessId: string, id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/businesses/${businessId}/time-offs/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  async getCustomers(businessId: string): Promise<Customer[]> {
    return this.request<Customer[]>(`/api/businesses/${businessId}/customers`);
  }

  // Availability
  async getAvailability(
    businessId: string,
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<AvailabilityResponse> {
    const query = new URLSearchParams({
      businessId,
      professionalId,
      serviceId,
      date,
    });
    return this.request<AvailabilityResponse>(`/api/availability?${query.toString()}`);
  }

  // Appointments
  async getAppointments(
    businessId: string,
    filter?: { date?: string; professionalId?: string }
  ): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filter?.date) params.append('date', filter.date);
    if (filter?.professionalId) params.append('professionalId', filter.professionalId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Appointment[]>(`/api/businesses/${businessId}/appointments${query}`);
  }

  async getAppointment(idOrCode: string): Promise<Appointment> {
    return this.request<Appointment>(`/api/appointments/${idOrCode}`);
  }

  async bookAppointment(payload: BookingPayload): Promise<BookingResult> {
    return this.request<BookingResult>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAppointmentStatus(
    id: string,
    status: Appointment['status'],
    reason?: string
  ): Promise<Appointment> {
    return this.request<Appointment>(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  // Analytics
  async recordAnalytics(businessId: string, type: AnalyticsEvent['type'], metadata?: any) {
    try {
      await this.request('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ businessId, type, metadata }),
      });
    } catch {
      // Non-blocking
    }
  }

  async getAnalytics(businessId: string) {
    return this.request<{
      pageViews: number;
      bookingStart: number;
      bookingCompleted: number;
      bookingCancelled: number;
      whatsappClicks: number;
      conversionRate: number;
    }>(`/api/businesses/${businessId}/analytics`);
  }

  // Super Admin
  async getSuperAdminStats() {
    return this.request<{
      totalBusinesses: number;
      activeBusinesses: number;
      trialBusinesses: number;
      totalAppointments: number;
      totalCustomers: number;
      totalProfessionals: number;
      businesses: Business[];
    }>('/api/superadmin/stats');
  }
}

export const api = new ApiService();
