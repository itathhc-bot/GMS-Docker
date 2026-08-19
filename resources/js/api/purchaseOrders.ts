import api from './client';

export type PurchaseOrderStatus = 'draft' | 'pending_manager' | 'pending_finance' | 'approved' | 'rejected';

export interface PurchaseOrder {
    id: string;
    supplier_id: string;
    status: PurchaseOrderStatus;
    total_amount: number;
}

export interface PurchaseOrderItem {
    id: string;
    po_id: string;
    part_name: string;
    quantity: number;
    unit_price: number;
}

export const getPurchaseOrders = async (params?: any): Promise<PurchaseOrder[]> => {
    const { data } = await api.get('/purchase-orders', { params });
    return data;
};

export const getPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
    const { data } = await api.get(`/purchase-orders/${id}`);
    return data;
};

export const createPurchaseOrder = async (po: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const { data } = await api.post('/purchase-orders', po);
    return data;
};

export const updatePurchaseOrder = async (id: string, po: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const { data } = await api.patch(`/purchase-orders/${id}`, po);
    return data;
};

export const approveManager = async (id: string, notes?: string): Promise<PurchaseOrder> => {
    const { data } = await api.post(`/purchase-orders/${id}/approve/manager`, { notes });
    return data;
};

export const approveFinance = async (id: string, notes?: string): Promise<PurchaseOrder> => {
    const { data } = await api.post(`/purchase-orders/${id}/approve/finance`, { notes });
    return data;
};

export const reject = async (id: string, reason: string): Promise<PurchaseOrder> => {
    const { data } = await api.post(`/purchase-orders/${id}/reject`, { reason });
    return data;
};
