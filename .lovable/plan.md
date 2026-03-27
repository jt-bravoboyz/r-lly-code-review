

# Add "Already have a login?" to Signup Screen

## Problem
Line 835 has a condition `!(!hasAccount && isSignUp)` that hides the "Already have an account? Sign in" link for new users on the signup screen. This means first-time visitors see no way to switch to login.

## Fix
Remove the guard on line 835 so the toggle always shows when not in forgot-password mode. The existing text already says "Already have an account? Sign in" when `isSignUp` is true — it just needs to be visible.

## Change

**`src/pages/Auth.tsx`** (lines 833-849)

Remove the `!(!hasAccount && isSignUp)` wrapper so the toggle link always renders:

```tsx
{/* Bottom links */}
{!isForgotPassword && (
  <div className="py-8 text-center relative z-10 space-y-3">
    <p 
      className="text-base font-montserrat"
      style={{ color: "rgba(255, 255, 255, 0.5)" }}
    >
      {isSignUp ? "Already have an account? " : "Don't have an account? "}
      <button 
        onClick={() => setAuthMode(isSignUp ? 'signin' : 'signup')}
        className="font-semibold hover:underline"
        style={{ color: "#FF6A00" }}
      >
        {isSignUp ? 'Log in' : 'Sign up'}
      </button>
    </p>
    ...
```

1 file, ~2 lines changed. The link text will say **"Already have an account? Log in"** at the bottom of the signup screen.

