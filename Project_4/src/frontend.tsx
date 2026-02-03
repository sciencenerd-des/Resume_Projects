import './styles/output.css';

// Extend window type for config promise
declare global {
  interface Window {
    __configPromise?: Promise<{
      convexUrl?: string;
      clerkPublishableKey?: string;
      wsUrl?: string;
    }>;
  }
}

// Wait for config to load before importing React app modules
// This ensures window.__APP_CONFIG__ is set before module-level code runs
async function bootstrap() {
  // Wait for config from index.html's inline script
  const configPromise = window.__configPromise;
  if (configPromise) {
    await configPromise;
  }

  // Now import React and app modules - they can safely read window.__APP_CONFIG__
  const [
    { default: React },
    { createRoot },
    { BrowserRouter },
    { ConvexClerkProvider },
    { ThemeProvider },
    { WorkspaceProvider },
    { CommandProvider },
    { default: App },
  ] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('react-router-dom'),
    import('./contexts/ConvexClerkProvider'),
    import('./contexts/ThemeContext'),
    import('./contexts/WorkspaceContext'),
    import('./contexts/CommandContext'),
    import('./App'),
  ]);

  const root = createRoot(document.getElementById('root')!);

  // Note: React.StrictMode removed due to conflict with Clerk's singleton initialization
  // Clerk throws "multiple ClerkProvider" error when StrictMode double-mounts components
  root.render(
    <ConvexClerkProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <WorkspaceProvider>
            <CommandProvider>
              <App />
            </CommandProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ConvexClerkProvider>
  );
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap app:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<p style="color:#ef4444;padding:20px;font-family:Inter,sans-serif;">Failed to start application: ${err.message}</p>`;
  }
});
