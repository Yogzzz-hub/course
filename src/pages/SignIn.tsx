import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHero, Button } from '../components/ui';

export default function SignInPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const isAdmin = location.pathname.includes('admin');
  const returnTo = search.get('returnTo') || search.get('returnUrl') || (isAdmin ? '/admin-panel' : '/student-panel');

  useEffect(() => {
    navigate(`/login?returnUrl=${encodeURIComponent(returnTo)}`, { replace: true });
  }, [navigate, returnTo]);

  return (
    <PageHero
      labels={['Secure', 'Access']}
      title="Redirecting to Portal Login…"
      description="Taking you to the unified Aintrix Academy portal login."
    >
      <div className="hero-actions">
        <Button to={`/login?returnUrl=${encodeURIComponent(returnTo)}`}>Go to Sign In</Button>
      </div>
    </PageHero>
  );
}
