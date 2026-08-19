import api from './client';

export interface ScanSession {
    pairCode: string;
    sessionId: string;
}

export interface ScanAttempt {
    id: string;
    pairCode: string;
    plateNumber: string;
}

export const createSession = async (): Promise<ScanSession> => {
    const { data } = await api.post('/scan-sessions');
    return data;
};

export const getSession = async (pairCode: string): Promise<ScanSession> => {
    const { data } = await api.get(`/scan-sessions/${pairCode}`);
    return data;
};

export const submitAttempt = async (pairCode: string, attemptData: any): Promise<ScanAttempt> => {
    const { data } = await api.post(`/scan-sessions/${pairCode}/attempt`, attemptData);
    return data;
};

export const confirmPlate = async (pairCode: string, attemptId: string): Promise<void> => {
    await api.post(`/scan-sessions/${pairCode}/confirm/${attemptId}`);
};
