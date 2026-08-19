import axios from 'axios';

// Use Vite proxy: baseURL '' → requests go to same origin, proxied to backend.
// In production build, change baseURL to your backend URL.
const api = axios.create({
  baseURL: '',
  timeout: 30000, // allow time for recommend computation
});

export const searchItems = async (query: string) => {
  const response = await api.get('/api/search', { params: { q: query, limit: 20 } });
  return response.data;
};

export const getRecommendations = async (userId: number, n: number = 10) => {
  const response = await api.get('/api/recommend', { params: { user_id: userId, n } });
  return response.data;
};

export const rateItem = async (userId: number, itemId: string, rating: number) => {
  const response = await api.post('/api/rate', { user_id: userId, item_id: itemId, rating });
  return response.data;
};

export const getItemDetails = async (itemId: string) => {
  const response = await api.get(`/api/item/${itemId}`);
  return response.data;
};

export const getUserRatings = async (userId: number) => {
  const response = await api.get(`/api/user/${userId}/ratings`);
  return response.data;
};

export const deleteRating = async (userId: number, itemId: string) => {
  const response = await api.delete(`/api/user/${userId}/rating/${itemId}`);
  return response.data;
};

// New: get popular movies/shows for trending/popular tabs
export const getPopularMovies = async (limit: number = 20) => {
  const response = await api.get('/api/movies', { params: { limit } });
  return response.data;
};

export const getPopularShows = async (limit: number = 20) => {
  const response = await api.get('/api/shows', { params: { limit } });
  return response.data;
};

export default api;