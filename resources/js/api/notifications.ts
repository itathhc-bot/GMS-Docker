import api from './client';

export const getNotifications = () => api.get('/user/notifications').then(r => r.data);
export const markAsRead = (id: string) => api.patch(`/user/notifications/${id}/read`);
export const markAllRead = () => api.post('/user/notifications/read-all');
