import axios from 'axios';

const DEFAULT_BACKEND_URL = "https://jobai-0z3h.onrender.com";
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = import.meta.env.PROD && (!configuredBaseUrl || configuredBaseUrl === "/")
    ? DEFAULT_BACKEND_URL
    : (configuredBaseUrl || DEFAULT_BACKEND_URL);

const api=axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true
});

export async function register({username,email,password}){
    try{
    const response = await api.post("/api/auth/register",{
        username,
        email,  
        password
    });
    return response.data;
    }
    catch(error){
        console.error("Registration failed:", error);
        throw error;
    }
}

export async function login({email,password}){
    try{
        const response=await api.post("/api/auth/login",{
            email,
            password
        });
        return response.data;
    }
    catch(error){
        console.error("Login failed:", error);
        throw error;
    }
}

export async function logout(){
    try{
        const response = await api.get("/api/auth/logout");
        return response.data;
    }
    catch(error){   
        console.error("Logout failed:", error);
        throw error;
    }
}

export async function getMe() {
    try{
        const response = await api.get("/api/auth/get-me");
        return response.data;
    }
    catch(error){
        console.error("Fetching user data failed:", error);
        throw error;
    }
}