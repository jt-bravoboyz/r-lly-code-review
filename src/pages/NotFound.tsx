import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // If this page loaded with OAuth tokens in the URL (the broker may redirect
    // to a path that doesn't exactly match /auth/return), bridge them back to
    // the native app via the custom URL scheme so appUrlOpen fires.
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hasOAuthTokens =
      hash.includes('access_token=') ||
      params.has('code') ||
      params.has('access_token');

    if (hasOAuthTokens) {
      window.location.href = `com.bravoboyz.rally://auth/return${window.location.search}${window.location.hash}`;
      return;
    }

    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
