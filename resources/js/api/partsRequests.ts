import api from './client';

export type PartsRequestStatus = 'pending' | 'approved' | 'rejected' | 'issued';
export type PartsRequestUrgency = 'low' | 'medium' | 'high';

export interface PartsRequest {
    id: string;
    job_card_id: string;
    part_name: string;
    quantity: number;
    urgency: PartsRequestUrgency;
    status: PartsRequestStatus;
    requested_by: string;
    notes?: string;
}

export const getPartsRequests = async (params?: any): Promise<PartsRequest[]> => {
    const { data } = await api.get('/parts-requests', { params });
    return data;
};

export const getPartsRequest = async (id: string): Promise<PartsRequest> => {
    const { data } = await api.get(`/parts-requests/${id}`);
    return data;
};

export const createPartsRequest = async (request: Partial<PartsRequest>): Promise<PartsRequest> => {
    const { data } = await api.post('/parts-requests', request);
    return data;
};

export const updatePartsRequest = async (id: string, request: Partial<PartsRequest>): Promise<PartsRequest> => {
    const { data } = await api.patch(`/parts-requests/${id}`, request);
    return data;
};

export const approve = async (id: string): Promise<PartsRequest> => {
    const { data } = await api.post(`/parts-requests/${id}/approve`);
    return data;
};

export const reject = async (id: string, reason: string): Promise<PartsRequest> => {
    const { data } = await api.post(`/parts-requests/${id}/reject`, { reason });
    return data;
};

export const issue = async (id: string, issueData: any): Promise<PartsRequest> => {
    const { data } = await api.post(`/parts-requests/${id}/issue`, issueData);
    return data;
};
