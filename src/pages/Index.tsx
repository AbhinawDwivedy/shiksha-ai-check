import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const Index = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ShikshaCheck...</p>
        </div>
      </div>
    )
  }

  // Redirect based on auth status
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />
};

export default Index;
