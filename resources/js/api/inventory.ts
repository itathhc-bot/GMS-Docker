import api from './client';

export interface InventoryItem {
    id: string;
    part_number: string;
    name: string;
    quantity: number;
    min_stock_level: number;
    unit_price: number;
    location?: string;
}

export const getInventory = async (params?: any): Promise<InventoryItem[]> => {
    const { data } = await api.get('/inventory', { params });
    return data;
};

export const createInventoryItem = async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data } = await api.post('/inventory', item);
    return data;
};

export const updateInventoryItem = async (id: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data } = await api.patch(`/inventory/${id}`, item);
    return data;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
};

export const getLowStockItems = async (): Promise<InventoryItem[]> => {
    const { data } = await api.get('/inventory/low-stock');
    return data;
};
