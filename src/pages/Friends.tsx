import { Navigate } from 'react-router-dom';

/**
 * /friends is no longer a standalone page — Friends lives inside the
 * Squads page as a tab. This route exists for backwards-compatible
 * deep links (notifications, old shares) and redirects accordingly.
 */
export default function Friends() {
  return <Navigate to="/squads?tab=friends" replace />;
}
