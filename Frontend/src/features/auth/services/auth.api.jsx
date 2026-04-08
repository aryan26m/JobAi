import axios from 'axios';
import { API_BASE_URL } from '../../../lib/apiBaseUrl';

const api=axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true,
    timeout: 15000
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