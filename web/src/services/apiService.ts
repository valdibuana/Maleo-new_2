import api from "../lib/axios";

/**
 * Debounce cache for in-flight GET requests.
 * If a new request arrives for the same endpoint within the debounce window,
 * the previous request is cancelled via AbortController.
 */
const inflightControllers = new Map<string, AbortController>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 300;

/**
 * Cancel any in-flight request + pending debounce for an endpoint key.
 */
function cancelPending(key: string) {
  const timer = debounceTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(key);
  }
  const controller = inflightControllers.get(key);
  if (controller) {
    controller.abort();
    inflightControllers.delete(key);
  }
}

export const apiService = {
  /**
   * GET list endpoint.
   * Params are passed as-is from caller.
   *
   * Rapid repeated calls to the same endpoint are debounced (300ms),
   * and previous in-flight requests are cancelled automatically.
   */
  getAll: async (endpoint: string, params?: any): Promise<any> => {
    // Cancel previous debounce + in-flight for this endpoint
    const key = endpoint;
    cancelPending(key);

    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(async () => {
        debounceTimers.delete(key);
        const controller = new AbortController();
        inflightControllers.set(key, controller);
        try {
          const response = await api.get(endpoint, {
            params,
            signal: controller.signal,
          });
          inflightControllers.delete(key);
          resolve(response.data);
        } catch (err: any) {
          inflightControllers.delete(key);
          if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
            // Silently swallow — a newer request replaced this one
            return;
          }
          reject(err);
        }
      }, DEBOUNCE_MS);
      debounceTimers.set(key, timer);
    });
  },

  getById: async (endpoint: string, id: string | number) => {
    const response = await api.get(`${endpoint}/${id}`);
    return response.data;
  },

  create: async (endpoint: string, data: any, config?: any) => {
    const response = await api.post(endpoint, data, config);
    return response.data;
  },

  update: async (endpoint: string, id: string | number, data: any) => {
    const response = await api.put(`${endpoint}/${id}`, data);
    return response.data;
  },

  remove: async (endpoint: string, id: string | number, config?: any) => {
    const response = await api.delete(`${endpoint}/${id}`, config);
    return response.data;
  },
};
