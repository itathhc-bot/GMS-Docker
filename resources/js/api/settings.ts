import api from './client';

export interface AppSettings {
    company_name: string;
    tax_rate: number;
    currency: string;
}

export const getSettings = async (): Promise<AppSettings> => {
    const { data } = await api.get('/settings');
    return data;
};

export const updateSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const { data } = await api.patch('/settings', settings);
    return data;
};
