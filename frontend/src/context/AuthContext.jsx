import React, { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('transitops_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [permissions, setPermissions] = useState(() => {
    const raw = localStorage.getItem('transitops_permissions');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password, role) {
    const { data } = await api.post('/auth/login', { email, password, role });
    localStorage.setItem('transitops_token', data.token);
    localStorage.setItem('transitops_user', JSON.stringify(data.user));
    localStorage.setItem('transitops_permissions', JSON.stringify(data.permissions));
    setUser(data.user);
    setPermissions(data.permissions);
    return data;
  }

  function logout() {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    localStorage.removeItem('transitops_permissions');
    setUser(null);
    setPermissions(null);
  }

  function can(resource, needsEdit = false) {
    const level = permissions?.[resource];
    if (!level || level === '-') return false;
    if (needsEdit) return level === 'edit';
    return true;
  }

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
