import axios from 'axios';

const TOKEN_KEY = 'auth_token';

// In-memory cache of the token for immediate synchronous access
let memoryToken: string | null = null;

// Read initial token from sessionStorage (tab session) or localStorage (remembered session)
if (typeof window !== 'undefined') {
    try {
        memoryToken = window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) || null;
    } catch {
        memoryToken = null;
    }
}

export const setMemoryToken = (token: string | null, persist: boolean = false) => {
    memoryToken = token;
    if (typeof window !== 'undefined') {
        try {
            if (token) {
                if (persist) {
                    window.localStorage.setItem(TOKEN_KEY, token);
                    window.sessionStorage.removeItem(TOKEN_KEY);
                } else {
                    window.sessionStorage.setItem(TOKEN_KEY, token);
                    window.localStorage.removeItem(TOKEN_KEY);
                }
            } else {
                window.sessionStorage.removeItem(TOKEN_KEY);
                window.localStorage.removeItem(TOKEN_KEY);
            }
        } catch {
            /* ignore */
        }
    }
};

export const getMemoryToken = (): string | null => {
    if (memoryToken) return memoryToken;
    if (typeof window !== 'undefined') {
        try {
            memoryToken = window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) || null;
            return memoryToken;
        } catch {
            return null;
        }
    }
    return null;
};

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // For Sanctum CSRF cookie
});

// Request interceptor
api.interceptors.request.use(async (config) => {
    // Inject Bearer token if available in memory
    const token = getMemoryToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF token fetching for mutating requests if not already set
    if (
        config.method &&
        ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
    ) {
        // Axios automatically handles the XSRF-TOKEN cookie when withCredentials is true,
        // but we might need to fetch it first if it doesn't exist.
        // We'll leave the initial fetch to the Auth initialization or Login.
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Automatically unwrap Laravel Resource Collections and single resources
        if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
                // It's a collection (paginated or unpaginated resource collection)
                response.data = response.data.data;
            } else if ('data' in response.data && Object.keys(response.data).length <= 2) {
                // It's a single resource wrapped in { data: ... }
                response.data = response.data.data;
            }
        }
        return response;
    },
    async (error) => {
        if (error.response) {
            const status = error.response.status;
            const url = error.config?.url || '';
            if (status === 401 && !url.includes('/auth/login')) {
                // Token expired or invalid
                setMemoryToken(null);
                window.dispatchEvent(new Event('auth:unauthorized'));
            } else if (status === 419) {
                // CSRF token mismatch, might need to refresh cookie and retry
            }
        }
        return Promise.reject(error);
    }
);

export default api;
