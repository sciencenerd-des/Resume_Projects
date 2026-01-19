import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  // Redirect when user is logged in
  useEffect(() => {
    if (user) {
      navigate('/workspaces', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (email: string, password: string) => {
    await signIn.mutateAsync({ email, password });
    // Navigation will happen via useEffect when user state updates
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VerityDraft</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <LoginForm onSubmit={handleLogin} isLoading={signIn.isPending} />

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
