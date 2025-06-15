import axios from 'axios';

const KEYCLOAK_TOKEN_URL = 'http://localhost:8080/realms/arts-realm/protocol/openid-connect/token';
const BACKEND_BASE_URL = 'http://localhost:8081';

const authApiClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const saveTokens = (accessToken, refreshToken, expiresIn, refreshExpiresIn) => {
  const now = Date.now();
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('access_token_expires_at', now + (expiresIn * 1000));
  localStorage.setItem('refresh_token_expires_at', now + (refreshExpiresIn * 1000));
};

const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');
const getAccessTokenExpiresAt = () => parseInt(localStorage.getItem('access_token_expires_at') || '0', 10);
const getRefreshTokenExpiresAt = () => parseInt(localStorage.getItem('refresh_token_expires_at') || '0', 10);

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('access_token_expires_at');
  localStorage.removeItem('refresh_token_expires_at');
};

const isAccessTokenExpired = () => {
  const expiresAt = getAccessTokenExpiresAt();
  return expiresAt > 0 && Date.now() >= expiresAt;
};

const isRefreshTokenExpired = () => {
  const expiresAt = getRefreshTokenExpiresAt();
  return expiresAt > 0 && Date.now() >= expiresAt;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

authApiClient.interceptors.request.use(
  async (config) => {
    let accessToken = getAccessToken();

    if (accessToken && isAccessTokenExpired()) {
      const refreshToken = getRefreshToken();

      if (refreshToken && !isRefreshTokenExpired()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newTokens = await refreshKeycloakToken(refreshToken);
            accessToken = newTokens.access_token;
            processQueue(null, accessToken);
          } catch (refreshError) {
            clearTokens();
            processQueue(refreshError, null);
            window.location.href = '/login'; 
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            config.headers.Authorization = `Bearer ${token}`;
            return config;
          }).catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        clearTokens();
        window.location.href = '/login'; 
        return Promise.reject(new Error("Срок действия токена обновления истек. Пожалуйста, войдите в систему еще раз"));
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

authApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();

      if (refreshToken && !isRefreshTokenExpired()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newTokens = await refreshKeycloakToken(refreshToken);
            const accessToken = newTokens.access_token;

            isRefreshing = false;
            processQueue(null, accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return authApiClient(originalRequest);

          } catch (refreshError) {
            isRefreshing = false;
            processQueue(refreshError, null);

            clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return authApiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const loginKeycloak = async (username, password) => {
  const params = new URLSearchParams();
  params.append('client_id', 'arts-app');
  params.append('grant_type', 'password');
  params.append('username', username);
  params.append('password', password);
  params.append('scope', 'openid');

  try {
    const response = await axios.post(KEYCLOAK_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token, expires_in, refresh_expires_in } = response.data;
    saveTokens(access_token, refresh_token, expires_in, refresh_expires_in);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const refreshKeycloakToken = async (refreshToken) => {
  const params = new URLSearchParams();
  params.append('client_id', 'arts-app');
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('scope', 'openid');

  try {
    const response = await axios.post(KEYCLOAK_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token, expires_in, refresh_expires_in } = response.data;
    saveTokens(access_token, refresh_token, expires_in, refresh_expires_in);
    return response.data;
  } catch (error) {
    clearTokens();
    throw error;
  }
};

export const logoutKeycloak = () => {
  clearTokens();
};

export const registerUserInKeycloak = async (username, email, password) => {
  try {
    const response = await authApiClient.post('/keycloak/register', {
      username,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const registerUserProfile = async (keycloakId, username) => {
  try {
    const response = await authApiClient.post('/users/register', {
      id: keycloakId,
      userName: username,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFeedArtworks = async (type = 'trending', page = 0, size = 12) => {
  try {
    const response = await authApiClient.get('/arts/feed', {
      params: {
        type: type,
        page: page,
        size: size
      }
    });
    return response.data;
  } catch (error) {
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

export const getArtAndAuthorDetails = async (id) => {
  try {
    const response = await authApiClient.get('/arts/with-author', {
      params: { id: id }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getArtTags = async (id) => {
  try {
    const response = await authApiClient.get('/tags/art', {
      params: { id: id }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getArtComments = async (id, page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/comments/art', {
      params: {
        id: id,
        page: page,
        size: size
      }
    });
    return response.data.content;
  } catch (error) {
    throw error;
  }
};

export const checkSubscriptionStatus = async (targetId) => {
  try {
    const response = await authApiClient.get(`/users/subscribe?id=${targetId}`);
    return response.data;
  } catch (error) {
    return false;
  }
};

export const checkLikeStatus = async (artId) => {
  try {
    const response = await authApiClient.get('/arts/like', {
      params: { id: artId }
    });
    return response.data;
  } catch (error) {
    return false;
  }
};

export const getCurrentUserMinInfo = async () => {
  try {
    const response = await authApiClient.get('/users/me/min');
    return response.data;
  } catch (error) {
    return null; 
  }
};

export const toggleSubscription = async (targetId) => {
  try {
    const response = await authApiClient.post(`/users/subscribe?id=${targetId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const toggleLikeArt = async (artId) => {
  try {
    const response = await authApiClient.post('/arts/like', null, {
      params: { id: artId }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const postComment = async (commentData) => {
  try {
    const response = await authApiClient.post('/comments/art', commentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getLikedArtworks = async (page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/arts/likes', {
      params: {
        page: page,
        size: size
      }
    });
    return response.data;
  } catch (error) {
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const response = await authApiClient.get('/users', {
      params: { id: userId }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserArtworks = async (userId, page = 1, size = 12) => {
  try {
    const response = await authApiClient.get('/users/arts', {
      params: { 
        id: userId,
        page: page,
        size: size
      }
    });
    return response.data;
  } catch (error) {
    return { content: [], totalElements: 0, totalPages: 0, number: page };
  }
};

export const getUserSocialNetworks = async (userId) => {
  try {
    const response = await authApiClient.get('/users/social-networks', {
      params: { id: userId }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getCurrentUserMin = async () => {
    try {
        const response = await authApiClient.get('/users/me/min');
        return response.data;
    } catch (error) {
        return null;
    }
};

export const searchArtsByName = async (query = '', page = 1, size = 12) => {
    try {
        const response = await authApiClient.get('/arts/search', {
            params: { query, page, size }
        });
        return response.data;
    } catch (error) {
        return { content: [], totalPages: 0, totalElements: 0, number: page -1 };
    }
};

export const getCurrentUserProfile = async () => {
    try {
        const response = await authApiClient.get('/users/me');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateCurrentUserProfile = async (userData) => {
    try {
        const response = await authApiClient.put('/users/me', userData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getSubscriptionsWithArts = async (artsPerAuthor = 3, page = 1, size = 12) => {
    try {
        const response = await authApiClient.get('/users/subs-with-arts', {
            params: {
                artsPerAuthor,
                page,
                size
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createArt = async (artData) => {
    try {
        const response = await authApiClient.post('/arts', artData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateArt = async (artData) => {
    try {
        const response = await authApiClient.put('/arts', artData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteArt = async (artId) => {
    try {
        await authApiClient.delete(`/arts?id=${artId}`);
    } catch (error) {
        throw error;
    }
};

export default authApiClient;

export { getAccessToken, getRefreshToken, isAccessTokenExpired, isRefreshTokenExpired, clearTokens};