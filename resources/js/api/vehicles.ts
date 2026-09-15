import api from './client';

export interface Vehicle {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    status: VehicleStatus;
    fleet_number?: string;
    department?: string;
    created_at: string;
    updated_at: string;
}

export type VehicleStatus = 'active' | 'in_repair' | 'out_of_service';

export const getVehicles = async (params?: any): Promise<Vehicle[]> => {
    const { data } = await api.get('/vehicles', { params });
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
        return data.data;
    }
    return Array.isArray(data) ? data : [];
};

export const getVehicle = async (id: string): Promise<Vehicle> => {
    const { data } = await api.get(`/vehicles/${id}`);
    return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
};

export const createVehicle = async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await api.post('/vehicles', vehicle);
    return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await api.patch(`/vehicles/${id}`, vehicle);
    return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
};

export const deleteVehicle = async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
};

export const getVehicleHistory = async (id: string): Promise<any[]> => {
    const { data } = await api.get(`/vehicles/${id}/history`);
    return data;
};
