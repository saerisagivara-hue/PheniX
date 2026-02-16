import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">PhoeniX</Link>
        <nav className="navbar-links">
          <Link to="/">Home</Link>
          {user ? (
            <>
              <Link to="/create">Create bot</Link>
              <Link to={`/profile/${user.username}`}>Profile</Link>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
