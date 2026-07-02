import axios from 'axios';

// Create Axios client pointing to our API root
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add the Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Attempt to refresh the access token
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken,
          });

          if (response.status === 200) {
            const newAccessToken = response.data.access;
            localStorage.setItem('access_token', newAccessToken);

            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }

      // If refresh token fails or does not exist, trigger logout
      logout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    return Promise.reject(error);
  }
);

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('donor_id');
  // Dispatch a custom event to notify App.tsx of logout state change
  window.dispatchEvent(new Event('auth-changed'));
}

export function login(accessToken: string, refreshToken: string, username: string, role: string = 'coordinator', donorId?: number) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('username', username);
  localStorage.setItem('role', role);
  if (donorId) {
    localStorage.setItem('donor_id', String(donorId));
  } else {
    localStorage.removeItem('donor_id');
  }
  window.dispatchEvent(new Event('auth-changed'));
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token');
}

export function getUsername(): string {
  return localStorage.getItem('username') || '';
}

export function getRole(): string {
  return localStorage.getItem('role') || '';
}

export function getDonorId(): number | null {
  const id = localStorage.getItem('donor_id');
  return id ? Number(id) : null;
}
