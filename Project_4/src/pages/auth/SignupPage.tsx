import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SignupForm } from '../../components/auth/SignupForm';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();

  // Redirect when user is signed up and logged in
  useEffect(() => {
    if (user) {
      navigate('/workspaces', { replace: true });
    }
  }, [user, navigate]);

  const handleSignup = async (email: string, password: string, _name: string) => {
    await signUp.mutateAsync({ email, password });
    // Navigation will happen via useEffect when user state updates
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">
            Start verifying your documents with AI-powered evidence tracking
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <SignupForm onSubmit={handleSignup} isLoading={signUp.isPending} />
        </div>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
