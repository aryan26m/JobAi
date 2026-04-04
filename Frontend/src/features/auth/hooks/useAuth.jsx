import { use, useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { register, login, logout, getMe } from "../services/auth.api";
export function useAuth(){
    const context=useContext(AuthContext);
    const {user,setUser,loading,setLoading}=context;

    async function handleRegister({username,email,password}){
        setLoading(true);
      try{
        const response=await register({username,email,password});
        setUser(response.user);
      }
      catch(error){
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
        }   
        catch(error){
        }        finally{
            setLoading(false);
        }
    }
    async function handleLogout(){
        setLoading(true);
        try{
            await logout();
            setUser(null);
        }
        catch(error){
        }        finally{
            setLoading(false);
        }
    }

    useEffect(()=>{
        const getAndSetUser=async()=>{
            setLoading(true);
            try{
                const data= await getMe();
                setUser(data.user);
            }
            catch(error){
                setUser(null);
            }
            finally{
                setLoading(false);
            }
        }
        getAndSetUser();
    },[]);
    return{
        user,setUser,
        loading,setLoading,
        handleRegister,handleLogin,handleLogout }
}