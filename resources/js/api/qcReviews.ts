import api from './client';

export type QcStatus = 'pending' | 'passed' | 'failed';

export interface QcReview {
    id: string;
    job_card_id: string;
    status: QcStatus;
    reviewer_id: string;
    notes?: string;
}

export interface QcChecklistItem {
    id: string;
    qc_review_id: string;
    item_name: string;
    is_checked: boolean;
}

export const getQcReviews = async (params?: any): Promise<QcReview[]> => {
    const { data } = await api.get('/qc-reviews', { params });
    return data;
};

export const getQcReview = async (id: string): Promise<QcReview> => {
    const { data } = await api.get(`/qc-reviews/${id}`);
    return data;
};

export const createQcReview = async (review: Partial<QcReview>): Promise<QcReview> => {
    const { data } = await api.post('/qc-reviews', review);
    return data;
};

export const updateChecklist = async (reviewId: string, items: QcChecklistItem[]): Promise<QcChecklistItem[]> => {
    const { data } = await api.patch(`/qc-reviews/${reviewId}/checklist`, { items, checklist_items: items });
    return data;
};

export const finalize = async (reviewId: string, finalData: any): Promise<QcReview> => {
    const { data } = await api.post(`/qc-reviews/${reviewId}/finalize`, finalData);
    return data;
};
