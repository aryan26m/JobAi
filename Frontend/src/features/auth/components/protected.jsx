import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from 'react'

const Protected = ({children}) => {
    const {initializing,user}=useAuth();
    if(initializing){
        return (<main className='auth-page'><h1>Loading</h1></main>)
    }
    if(!user){
       return <Navigate to={"/login"} />
    } 
    return children;
}
export default Protected