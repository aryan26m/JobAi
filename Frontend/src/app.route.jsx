import { createBrowserRouter } from 'react-router';
import Login from './features/auth/pages/login.jsx';
import Register from './features/auth/pages/register.jsx';
import Protected from './features/auth/components/protected.jsx';
import Home from './features/interview/pages/Home.jsx';
import Interview from './features/interview/pages/Interview.jsx';
import Landing from './features/marketing/pages/Landing.jsx';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Landing />
    },
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/register',
        element: <Register />
    },
    {
        path: '/dashboard',
        element:<Protected>
         <Home/>
        </Protected> 
    },
    {
        path:'/interview',
        element:<Protected>
            <Interview/>
        </Protected>
    },
    {
        path:'/interview/:interviewId',
        element:<Protected>
            <Interview/>
        </Protected>
    }
])