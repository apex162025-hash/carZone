"use client";

import axios from "axios";

import { createApiFailureError, isApiFailureEnvelope } from "@/lib/api/api-error-handler";
import { getApiBaseUrl } from "@/lib/config/api-base-url";
import { getAuthAccessToken, getAuthTokenType, useAuthStore } from "@/lib/store/auth-store";

/** Bearer-authenticated admin client. Token is read from the auth store per request. */
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = getAuthAccessToken();
  if (token) {
    config.headers.Authorization = `${getAuthTokenType()} ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Laravel can answer 200 with `{ status: false }` — treat it as a failure.
    if (isApiFailureEnvelope(response.data)) {
      return Promise.reject(createApiFailureError(response.data));
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url ?? "");
    const hadAuth = Boolean(error?.config?.headers?.Authorization);
    if (status === 401 && hadAuth && !url.includes("/auth/login")) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);
