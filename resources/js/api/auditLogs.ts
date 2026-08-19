import api from './client';

export interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    model_type: string;
    model_id: string;
    changes: any;
    created_at: string;
}

export const getAuditLogs = async (params?: any): Promise<AuditLog[]> => {
    const { data } = await api.get('/audit-logs', { params });
    return data;
};
