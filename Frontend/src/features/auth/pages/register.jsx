import React, { useState } from 'react'
import { useNavigate,Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import "../auth.form.scss"
const Register = () => {
    const {loading,handleRegister}=useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const handleSubmit = async(e) => {
        e.preventDefault();
        try {
            await handleRegister({username,email,password});
            navigate("/dashboard");
        } catch (error) {
            // Keep user on register page when registration fails.
        }
    }
    return(
   <main className='auth-page'>
            <div className="form-container">
                <h1>Register</h1>
                <p className='form-subtitle'>Create your account to unlock personalized interview strategy.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input onChange={(e)=>{setUsername(e.target.value)}}
                            type="text" id="username" name='username' placeholder='Enter your Username' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input onChange={(e)=>{setEmail(e.target.value)}}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input onChange={(e)=>{setPassword(e.target.value)}}
                        type="password" id="password" name='password' placeholder='Enter password' />
                    </div>
                    <button className='button primary-button' disabled={loading}>
                        {loading ? 'Creating account...' : 'Register'}
                    </button>
                </form>
                <p>Already have an account ? <Link to={"/login"}>Login</Link></p>
            </div>
        </main>  
    )
}

export default Register