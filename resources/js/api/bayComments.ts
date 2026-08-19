import api from './client';

export interface BayComment {
    id: string;
    bay_number: string;
    comment: string;
    created_at: string;
}

export const getBayComments = async (bayNumber: string): Promise<BayComment[]> => {
    const { data } = await api.get(`/bay-comments`, { params: { bay: bayNumber } });
    return data;
};

export const createBayComment = async (commentData: Partial<BayComment>): Promise<BayComment> => {
    const { data } = await api.post('/bay-comments', commentData);
    return data;
};

export const deleteBayComment = async (id: string): Promise<void> => {
    await api.delete(`/bay-comments/${id}`);
};
