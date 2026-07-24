export const API_URL = "https://paveltomilov.ru/myapp";

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  // Если токен невалидный — удаляем его
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Можно вызвать logout из контекста, но пока просто удаляем
  }

  return response;
};
