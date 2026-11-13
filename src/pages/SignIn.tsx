import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHero, Button } from '../components/ui';

export default function SignInPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const isAdmin = location.pathname.includes('admin');
  const returnTo = search.get('returnTo') || search.get('returnUrl') || (isAdmin ? '/admin-panel' : '/student-panel');

  const loginTarget = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    navigate(loginTarget, { replace: true });
  }, [navigate, loginTarget]);

  return (
    <PageHero
      labels={['Secure', 'Access']}
      title={isAdmin ? 'Admin sign-in' : 'Student sign-in'}
      description="Redirecting to the central authentication portal..."
    >
      <div className="hero-actions">
        <Button to={loginTarget}>Proceed to Sign In</Button>
        <Button to="/contact" secondary>Contact the academy</Button>
      </div>
    </PageHero>
  );
}
