const DEFAULT_PROD_BACKEND_URL = "https://jobai-0z3h.onrender.com";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl !== "/"
    ? configuredBaseUrl
    : DEFAULT_PROD_BACKEND_URL;
