import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate,Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx';
const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await handleLogin({email,password})
            navigate('/dashboard')
        } catch (error) {
            // Keep user on login page when authentication fails.
        }
    }

    return (
        <main className='auth-page'>
            <div className="form-container">
                <h1>Login</h1>
                <p className='form-subtitle'>Continue your interview prep journey with your account.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name='password' placeholder='Enter password' />
                    </div>
                    <button className='button primary-button' disabled={loading}>
                        {loading ? 'Signing in...' : 'Login'}
                    </button>
                </form>
                <p>Don't have an account? <Link to={"/register"} >Register</Link> </p>
            </div>
        </main>
    )
}

export default Login