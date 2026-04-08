import { createContext, useEffect, useState } from "react";
import { getMe, login, logout, register } from "./services/auth.api";

export const AuthContext=createContext();

export const AuthProvider = ({children})=>{
    const[user,setUser]=useState(null);
    const[loading,setLoading]=useState(false);
    const[initializing,setInitializing]=useState(true);

    async function handleRegister({username,email,password}){
        setLoading(true);
        try{
            const response=await register({username,email,password});
            setUser(response.user);
            return response;
        }
        finally{
            setLoading(false);
        }
    }

    async function handleLogin({email,password}){
        setLoading(true);
        try{
            const response=await login({email,password});
            setUser(response.user);
            return response;
        }
        finally{
            setLoading(false);
        }
    }

    async function handleLogout(){
        setLoading(true);
        try{
            await logout();
            setUser(null);
        }
        finally{
            setLoading(false);
        }
    }

    useEffect(()=>{
        let isMounted = true;
        const initializeAuth = async()=>{
            setInitializing(true);
            try{
                const data= await getMe();
                if (isMounted) {
                    setUser(data.user);
                }
            }
            catch(error){
                if (isMounted) {
                    setUser(null);
                }
            }
            finally{
                if (isMounted) {
                    setInitializing(false);
                }
            }
        };
        initializeAuth();

        return () => {
            isMounted = false;
        };
    },[]);

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            setLoading,
            initializing,
            handleRegister,
            handleLogin,
            handleLogout
        }}>
            {children}
        </AuthContext.Provider>
    )
} 