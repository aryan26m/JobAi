import React, { useState } from 'react'
import { useNavigate,Link, Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import "../auth.form.scss"
const Register = () => {
    const {loading,handleRegister,user,initializing}=useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState('');

    const validate = () => {
        const nextErrors = {};

        if (!username.trim()) {
            nextErrors.username = 'Username is required.';
        }

        if (!email.trim()) {
            nextErrors.email = 'Email is required.';
        } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            nextErrors.email = 'Enter a valid email address.';
        }

        if (!password.trim()) {
            nextErrors.password = 'Password is required.';
        } else if (password.trim().length < 6) {
            nextErrors.password = 'Password must be at least 6 characters.';
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async(e) => {
        e.preventDefault();
        setSubmitError('');
        if (!validate()) {
            return;
        }
        try {
            await handleRegister({username,email,password});
            navigate("/dashboard");
        } catch (error) {
            const message = error?.response?.data?.message || 'Registration failed. Please try again.';
            setSubmitError(message);
        }
    }

    if (initializing) {
        return (<main className='auth-page'><h1>Loading</h1></main>)
    }

    if (user) {
        return <Navigate to='/dashboard' replace />
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
                            value={username}
                            type="text" id="username" name='username' placeholder='Enter your Username' />
                        {fieldErrors.username && <p className='input-error'>{fieldErrors.username}</p>}
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input onChange={(e)=>{setEmail(e.target.value)}}
                            value={email}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                        {fieldErrors.email && <p className='input-error'>{fieldErrors.email}</p>}
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input onChange={(e)=>{setPassword(e.target.value)}}
                        value={password}
                        type="password" id="password" name='password' placeholder='Enter password' />
                        {fieldErrors.password && <p className='input-error'>{fieldErrors.password}</p>}
                    </div>
                    {submitError && <p className='form-error'>{submitError}</p>}
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