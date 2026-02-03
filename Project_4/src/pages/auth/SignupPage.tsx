import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { SignUp } from '@clerk/clerk-react';
import { useConvexAuthState } from '../../hooks/useConvexAuth';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuthState();

  // Redirect when user is signed up and logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/workspaces', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <Shield className="w-7 h-7 text-zinc-900" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">Create your account</h1>
          <p className="mt-2 text-zinc-400">
            Start verifying your documents with AI-powered evidence tracking
          </p>
        </div>

        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            fallbackRedirectUrl="/workspaces"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-zinc-800 border border-zinc-700 shadow-xl",
                headerTitle: "text-zinc-100",
                headerSubtitle: "text-zinc-400",
                socialButtonsBlockButton: "bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600",
                formFieldLabel: "text-zinc-300",
                formFieldInput: "bg-zinc-700 border-zinc-600 text-zinc-100",
                formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-zinc-900",
                footerActionLink: "text-amber-500 hover:text-amber-400",
                identityPreviewEditButton: "text-amber-500",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
