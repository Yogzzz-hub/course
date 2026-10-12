import { useLocation } from 'react-router-dom';
import { PageHero, Button } from '../components/ui';

/** Provider-owned authentication is configured separately; never collect credentials here. */
export default function SignInPage() {
  const admin = useLocation().pathname === '/auth/admin/sign-in';
  return <PageHero eyebrow="ACCOUNT ACCESS" title={admin ? 'Admin sign-in' : 'Student sign-in'} description="The authentication service has not been connected to this website yet. Contact the academy for account access."><div className="hero-actions"><Button to={admin ? '/admin-panel' : '/student-panel'}>Return to workspace</Button><Button to="/contact" secondary>Contact the academy</Button></div></PageHero>;
}
