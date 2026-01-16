import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useConvexAuthState } from '../../hooks/useConvexAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuthState();

  // Redirect when user is logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/workspaces', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">VerityDraft</h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
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
