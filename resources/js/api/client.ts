import axios from 'axios';

// Memory store for the bearer token
let memoryToken: string | null = null;

export const setMemoryToken = (token: string | null) => {
    memoryToken = token;
};

export const getMemoryToken = () => {
    return memoryToken;
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
    (response) => response,
    async (error) => {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                // Token expired or invalid
                setMemoryToken(null);
                // Optionally redirect to login or dispatch an event
                window.dispatchEvent(new Event('auth:unauthorized'));
            } else if (status === 419) {
                // CSRF token mismatch, might need to refresh cookie and retry
            }
        }
        return Promise.reject(error);
    }
);

export default api;
