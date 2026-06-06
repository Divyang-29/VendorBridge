import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("vendorbridge_token");
        const storedUser = localStorage.getItem("vendorbridge_user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Optionally fetch fresh profile details
          try {
            const profileRes = await api.get("/auth/profile");
            if (profileRes.success) {
              const freshUser = {
                ...JSON.parse(storedUser),
                profile: profileRes.user.profile,
              };
              setUser(freshUser);
              localStorage.setItem("vendorbridge_user", JSON.stringify(freshUser));
            }
          } catch (profileErr) {
            console.error("Fresh profile load failed:", profileErr);
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      if (data.success) {
        localStorage.setItem("vendorbridge_token", data.token);
        localStorage.setItem("vendorbridge_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const data = await api.post("/auth/register", { name, email, password, role });
      if (data.success) {
        localStorage.setItem("vendorbridge_token", data.token);
        localStorage.setItem("vendorbridge_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("vendorbridge_token");
    localStorage.removeItem("vendorbridge_user");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const isFormData = profileData instanceof FormData;
      const data = isFormData
        ? await api.uploadPut("/auth/profile", profileData)
        : await api.put("/auth/profile", profileData);
      if (data.success) {
        const updatedUser = {
          ...user,
          name: data.user?.name || user.name,
          profile: data.profile,
        };
        setUser(updatedUser);
        localStorage.setItem("vendorbridge_user", JSON.stringify(updatedUser));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const data = await api.post("/auth/forgot-password", { email });
      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const data = await api.post("/auth/verify-otp", { email, otp });
      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const data = await api.post("/auth/reset-password", { email, otp, newPassword });
      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        forgotPassword,
        verifyOtp,
        resetPassword,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
