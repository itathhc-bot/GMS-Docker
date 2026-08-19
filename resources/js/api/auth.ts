import api, { setMemoryToken } from './client';

export interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
}

export interface UserRole {
    role: string;
}

export interface User {
    id: string;
    email: string;
    profile: UserProfile;
    roles: string[];
    permissions: string[];
}

export interface AuthResponse {
    user: User;
    token: string;
}

export const fetchCsrfCookie = () => api.get('/sanctum/csrf-cookie', { baseURL: '' });

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    await fetchCsrfCookie();
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    if (data.token) {
        setMemoryToken(data.token);
    }
    return data;
};

export const logout = async (): Promise<void> => {
    await api.post('/auth/logout');
    setMemoryToken(null);
};

export const me = async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
};
