import api from './client';

export interface Role {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  is_system?: boolean;
  system_role?: string | null;
  guard_name?: string;
  permissions: string[];
  user_count?: number;
}

export const getRoles = (): Promise<Role[]> =>
  api.get<Role[]>('/roles').then(r => r.data);

export const getRole = (id: string): Promise<Role> =>
  api.get<Role>(`/roles/${id}`).then(r => r.data);

export const createRole = (data: { name: string; label?: string; description?: string | null; permissions?: string[] }): Promise<Role> =>
  api.post<Role>('/roles', data).then(r => r.data);

export const updateRole = (id: string, data: { name?: string; label?: string; description?: string | null }): Promise<Role> =>
  api.patch<Role>(`/roles/${id}`, data).then(r => r.data);

export const deleteRole = (id: string): Promise<void> =>
  api.delete(`/roles/${id}`).then(() => undefined);

export const syncPermissions = (id: string, permissions: string[]): Promise<Role> =>
  api.post<Role>(`/roles/${id}/permissions`, { permissions }).then(r => r.data);
