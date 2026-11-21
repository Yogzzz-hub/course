import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthBar } from './AuthBar';
import { RibbonMascot } from './RibbonMascot';
import './signup.css';

type Field = 'firstName' | 'lastName' | 'email' | 'password';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!values.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.password.length < 8) errors.password = 'Use at least 8 characters.';
  return errors;
}

/** Sign-up page: form on the left, the eye-tracking flower mascot on the right, theme picker underneath. */
export function SignUpPage() {
  const uid = useId();
  const [values, setValues] = useState<Values>({ firstName: '', lastName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState('');
  const [typingPassword, setTypingPassword] = useState(false);

  const id = (field: Field) => `${uid}-${field}`;
  const set = (field: Field) => (event: { target: { value: string } }) => {
    setValues(current => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors(current => ({ ...current, [field]: undefined }));
  };

  function createAccount(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus('Please fix the highlighted fields.');
      return;
    }
    // Account creation is not connected to a backend yet. Wire the request in here when the endpoint exists.
    setStatus('Details look good, but sign-up is not connected to the academy backend yet, so no account was created.');
  }

  function field(name: Field, label: string, type: string, autoComplete: string, extra: Record<string, unknown> = {}) {
    const message = errors[name];
    return (
      <div className={`su-field${message ? ' has-error' : ''}`}>
        <input
          id={id(name)}
          className="su-input"
          type={type}
          autoComplete={autoComplete}
          placeholder=" "
          value={values[name]}
          onChange={set(name)}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id(name)}-error` : undefined}
          {...extra}
        />
        <label htmlFor={id(name)}>{label}</label>
        {message && <p id={`${id(name)}-error`} className="su-error" role="alert">{message}</p>}
      </div>
    );
  }

  return (
    <section className="su-page" aria-labelledby={`${uid}-title`}>
      <div className="su-shell">
        <AuthBar />
        <div className="su-main">
          <p className="su-eyebrow">Start for free</p>
          <h1 id={`${uid}-title`} className="su-title">Create new account<span aria-hidden="true">.</span></h1>
          <p className="su-member">Already a member? <Link to="/login">Log in</Link></p>

          <form className="su-form" onSubmit={createAccount} noValidate>
            <div className="su-row">
              {field('firstName', 'First name', 'text', 'given-name')}
              {field('lastName', 'Last name', 'text', 'family-name')}
            </div>
            {field('email', 'Email', 'email', 'email')}
            {field('password', 'Password', 'password', 'new-password', {
              onFocus: () => setTypingPassword(true),
              onBlur: () => setTypingPassword(false),
            })}
            <div className="su-actions">
              <button type="button" className="su-btn su-btn-quiet" onClick={() => setStatus('Other sign-up methods are not available yet.')}>Change method</button>
              <button type="submit" className="su-btn su-btn-primary">Create account</button>
            </div>
            <p className="su-status" role="status" aria-live="polite">{status}</p>
          </form>

        </div>

        <div className="su-art">
          <RibbonMascot eyesClosed={typingPassword} />
        </div>
      </div>
    </section>
  );
}

export default SignUpPage;
