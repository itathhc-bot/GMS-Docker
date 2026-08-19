import api from './client';

export type JobCardStatus = 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'closed';
export type JobCardPriority = 'low' | 'medium' | 'high' | 'critical';

export interface JobCard {
    id: string;
    vehicle_id: string;
    reported_issue: string;
    status: JobCardStatus;
    priority: JobCardPriority;
    assigned_mechanic_id?: string;
    supervisor_id?: string;
    mechanic_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface JobCardInspection {
    id: string;
    job_card_id: string;
    item_name: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
}

export const getJobCards = async (params?: any): Promise<JobCard[]> => {
    const { data } = await api.get('/job-cards', { params });
    return data;
};

export const getJobCard = async (id: string): Promise<JobCard> => {
    const { data } = await api.get(`/job-cards/${id}`);
    return data;
};

export const createJobCard = async (jobCard: Partial<JobCard>): Promise<JobCard> => {
    const { data } = await api.post('/job-cards', jobCard);
    return data;
};

export const updateJobCard = async (id: string, jobCard: Partial<JobCard>): Promise<JobCard> => {
    const { data } = await api.patch(`/job-cards/${id}`, jobCard);
    return data;
};

export const deleteJobCard = async (id: string): Promise<void> => {
    await api.delete(`/job-cards/${id}`);
};

export const updateStatus = async (id: string, status: JobCardStatus): Promise<JobCard> => {
    const { data } = await api.patch(`/job-cards/${id}/status`, { status });
    return data;
};

export const assign = async (id: string, userId: string): Promise<JobCard> => {
    const { data } = await api.patch(`/job-cards/${id}/assign`, { user_id: userId });
    return data;
};

export const signMechanic = async (id: string, signatureData: string): Promise<JobCard> => {
    const { data } = await api.post(`/job-cards/${id}/sign/mechanic`, { signature: signatureData });
    return data;
};

export const signSupervisor = async (id: string, signatureData: string): Promise<JobCard> => {
    const { data } = await api.post(`/job-cards/${id}/sign/supervisor`, { signature: signatureData });
    return data;
};

export const getInspections = async (jobCardId: string): Promise<JobCardInspection[]> => {
    const { data } = await api.get(`/job-cards/${jobCardId}/inspections`);
    return data;
};

export const upsertInspection = async (jobCardId: string, inspectionData: Partial<JobCardInspection>[]): Promise<JobCardInspection[]> => {
    const { data } = await api.post(`/job-cards/${jobCardId}/inspections`, { inspections: inspectionData });
    return data;
};
