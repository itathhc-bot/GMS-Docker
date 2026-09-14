import api from './client';

export interface Driver {
    id: string;
    full_name: string;
    license_number: string | null;
    license_expiry: string | null;
    phone: string | null;
    email: string | null;
    department: string | null;
    is_active: boolean;
    notes: string | null;
}

export const getDrivers = async (): Promise<Driver[]> => {
    const { data } = await api.get('/drivers', { params: { per_page: 500, sort_by: 'full_name' } });
    return Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
};

export const createDriver = async (driver: Partial<Driver>): Promise<Driver> => {
    const { data } = await api.post('/drivers', driver);
    return data;
};

export const updateDriver = async (id: string, driver: Partial<Driver>): Promise<Driver> => {
    const { data } = await api.patch(`/drivers/${id}`, driver);
    return data;
};

export const deleteDriver = async (id: string): Promise<void> => {
    await api.delete(`/drivers/${id}`);
};
