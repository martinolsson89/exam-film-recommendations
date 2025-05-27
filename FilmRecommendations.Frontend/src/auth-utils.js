/**
 * Authentication utility functions for JWT token management
 */

export function saveAuthToken(token) {
  localStorage.setItem('authToken', token);
}

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function isAuthenticated() {
  const token = getAuthToken();
  return !!token;
}

export function removeAuthToken() {
  localStorage.removeItem('authToken');
}

export function getTokenPayload() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding token', e);
    return null;
  }
}

export function getUsername() {
  const payload = getTokenPayload();
  return payload ? payload.unique_name || payload.name || payload.sub : null;
}

export function withAuth(options = {}) {
  const token = getAuthToken();
  if (!token) return options;
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  };
}