import { useEffect } from 'react';
import {RouterProvider} from "react-router"
import { router } from './app.route.jsx';
import { AuthProvider } from "./features/auth/auth.context.jsx";
import { InterviewProvider } from "./features/interview/interview.context.jsx";
function App() {
  useEffect(() => {
    document.title = 'JobAi';
  }, []);

  return (
    <AuthProvider>
<InterviewProvider>
    <RouterProvider router={router} />
</InterviewProvider>
    </AuthProvider>
  )
}
export default App
