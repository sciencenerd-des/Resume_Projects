import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useConvexAuth } from 'convex/react';
import { useConvexAuthState } from '../../hooks/useConvexAuth';
import { Spinner } from '../ui/Spinner';

export function AuthGuard() {
  const { user, isLoading, isAuthenticated } = useConvexAuthState();
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // Detect Clerk-Convex JWT configuration issue:
  // User is signed in with Clerk but Convex auth failed
  if (isClerkLoaded && isSignedIn && !isConvexLoading && !isConvexAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-6 bg-card rounded-lg border border-border text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Authentication Configuration Error
          </h2>
          <p className="text-muted-foreground mb-4">
            You're signed in with Clerk, but Convex authentication failed. This usually means the JWT template "convex" hasn't been configured in Clerk.
          </p>
          <div className="text-left text-sm text-muted-foreground bg-muted p-4 rounded mb-4">
            <p className="font-medium mb-2">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to your Clerk Dashboard</li>
              <li>Navigate to JWT Templates</li>
              <li>Create a new template named "convex"</li>
              <li>Set the issuer URL in Convex environment variables</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
