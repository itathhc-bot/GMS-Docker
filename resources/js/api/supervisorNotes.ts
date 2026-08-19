import api from './client';

export const getSupervisorNotes = async (params?: Record<string, any>) => {
  const { data } = await api.get('/supervisor-notes', { params });
  return data;
};

export const createSupervisorNote = async (note: any) => {
  const { data } = await api.post('/supervisor-notes', note);
  return data;
};

export const updateSupervisorNote = async (id: string, note: any) => {
  const { data } = await api.put(`/supervisor-notes/${id}`, note);
  return data;
};

export const deleteSupervisorNote = async (id: string) => {
  const { data } = await api.delete(`/supervisor-notes/${id}`);
  return data;
};
