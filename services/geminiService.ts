
import { api } from './api';

// Now just a proxy to our centralized API service
// This keeps the interface compatible with existing components
export const getTennisAdvice = async (query: string): Promise<string> => {
  return await api.getAdvice(query);
};
