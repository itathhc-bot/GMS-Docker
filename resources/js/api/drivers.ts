import api from './client';

export interface Driver {
    id: string;
    name: string;
    license_number: string;
    contact_number?: string;
}

export const getDrivers = async (params?: any): Promise<Driver[]> => {
    const { data } = await api.get('/drivers', { params });
    return data;
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
