import api from './client';
import { UserRole } from './auth';

export interface UserDetail {
    id: string;
    email: string;
    is_active: boolean;
    profile: {
        first_name: string;
        last_name: string;
    };
    roles: UserRole[];
}

export const getUsers = async (params?: any): Promise<UserDetail[]> => {
    const { data } = await api.get('/users', { params });
    return data;
};

export const getUser = async (id: string): Promise<UserDetail> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
};

export const createUser = async (userData: any): Promise<UserDetail> => {
    const { data } = await api.post('/users', userData);
    return data;
};

export const deactivate = async (id: string): Promise<void> => {
    await api.post(`/users/${id}/deactivate`);
};

export const reactivate = async (id: string): Promise<void> => {
    await api.post(`/users/${id}/reactivate`);
};

export const assignRole = async (id: string, role: string): Promise<void> => {
    await api.post(`/users/${id}/roles`, { role });
};

export const removeRole = async (id: string, role: string): Promise<void> => {
    await api.delete(`/users/${id}/roles/${role}`);
};

export const setPassword = async (id: string, password: string): Promise<void> => {
    await api.post(`/users/${id}/password`, { password });
};


export const sendPasswordReset = async (id: string): Promise<void> => {
    await api.post(`/users/${id}/password-reset`);
};

export const updateUser = async (id: string, data: any): Promise<UserDetail> => {
    const { data: res } = await api.put(`/users/${id}`, data);
    return res;
};

export const getUserDetails = async (id: string): Promise<any> => {
    const { data } = await api.get(`/users/${id}/details`);
    return data;
};


