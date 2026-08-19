import api from './client';

export interface DashboardStats {
    total_vehicles: number;
    open_job_cards: number;
    pending_parts: number;
}

export interface ReportFilters {
    start_date?: string;
    end_date?: string;
    status?: string;
}

export const getDashboard = async (): Promise<DashboardStats> => {
    const { data } = await api.get('/reports/dashboard');
    return data;
};

export const getVehicleReport = async (params?: ReportFilters): Promise<any> => {
    const { data } = await api.get('/reports/vehicles', { params });
    return data;
};

export const getJobCardReport = async (params?: ReportFilters): Promise<any> => {
    const { data } = await api.get('/reports/job-cards', { params });
    return data;
};

export const getPartsReport = async (params?: ReportFilters): Promise<any> => {
    const { data } = await api.get('/reports/parts', { params });
    return data;
};
