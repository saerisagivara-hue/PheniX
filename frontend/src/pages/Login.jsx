import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, setToken } from '../api';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');
  const errorParam = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (errorParam === 'invalid-or-expired') setError('Verification link is invalid or expired.');
    if (errorParam === 'missing-token') setError('Missing verification token.');
  }, [errorParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.login(email.trim(), password);
      setToken(data.token);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email first. Check your inbox for the verification link.');
      } else {
        setError(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="nav-spacer" />
      <div className="auth-card">
        <h1>Log in to PhoeniX</h1>
        {verified === '1' && <p className="success-msg">Email verified! You can log in now.</p>}
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
