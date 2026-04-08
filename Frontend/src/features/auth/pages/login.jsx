import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate,Link, Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.jsx';
const Login = () => {

    const { loading, handleLogin, user, initializing } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [fieldErrors, setFieldErrors] = useState({})
    const [submitError, setSubmitError] = useState('')

    const validate = () => {
        const nextErrors = {}
        if (!email.trim()) {
            nextErrors.email = 'Email is required.'
        } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            nextErrors.email = 'Enter a valid email address.'
        }

        if (!password.trim()) {
            nextErrors.password = 'Password is required.'
        }

        setFieldErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitError('')
        if (!validate()) {
            return
        }

        try {
            await handleLogin({email,password})
            navigate('/dashboard')
        } catch (error) {
            const message = error?.response?.data?.message || 'Invalid email or password.'
            setSubmitError(message)
        }
    }

    if (initializing) {
        return (<main className='auth-page'><h1>Loading</h1></main>)
    }

    if (user) {
        return <Navigate to='/dashboard' replace />
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
                            value={email}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                        {fieldErrors.email && <p className='input-error'>{fieldErrors.email}</p>}
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            value={password}
                            type="password" id="password" name='password' placeholder='Enter password' />
                        {fieldErrors.password && <p className='input-error'>{fieldErrors.password}</p>}
                    </div>
                    {submitError && <p className='form-error'>{submitError}</p>}
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