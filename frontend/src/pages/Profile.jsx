import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { users as usersApi, bots as botsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import BotCard from '../components/BotCard';
import './Profile.css';

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [likedBots, setLikedBots] = useState([]);
  const [tab, setTab] = useState('characters');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isOwn = currentUser && currentUser.username === username;

  useEffect(() => {
    usersApi.getByUsername(username).then((data) => {
      setProfile(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!isOwn || !currentUser) return;
    botsApi.list().then((list) => {
      const liked = list.filter((b) => b.isLiked);
      setLikedBots(liked);
    }).catch(() => {});
  }, [isOwn, currentUser]);

  if (loading) return <div className="app-container page"><div className="nav-spacer" /><p>Loading...</p></div>;
  if (!profile) return <div className="app-container page"><div className="nav-spacer" /><p>Profile not found.</p></div>;

  const displayBots = tab === 'liked' ? likedBots : profile.bots || [];

  return (
    <div className="app-container page profile-page">
      <div className="nav-spacer" />
      <div className="profile-header">
        <img
          src={defaultAvatar + encodeURIComponent(profile.username)}
          alt=""
          className="avatar avatar-lg profile-avatar"
        />
        <div className="profile-info">
          <h1 className="profile-username">{profile.username}</h1>
          {isOwn && <p className="profile-handle">@{profile.username}</p>}
          {isOwn && (
            <p className="profile-stats">
              {profile.botCount ?? 0} characters · {profile.likeCount ?? 0} liked
            </p>
          )}
          <div className="profile-actions">
            {isOwn && (
              <>
                <Link to="/create" className="btn btn-primary">Create bot</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isOwn && (
        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${tab === 'characters' ? 'active' : ''}`}
            onClick={() => setTab('characters')}
          >
            Characters
          </button>
          <button
            type="button"
            className={`profile-tab ${tab === 'liked' ? 'active' : ''}`}
            onClick={() => setTab('liked')}
          >
            Liked
          </button>
        </div>
      )}

      <div className="profile-content">
        {displayBots.length === 0 ? (
          <p className="text-muted">
            {tab === 'liked' ? 'No liked characters yet.' : 'No characters yet.'}
          </p>
        ) : (
          <div className="bots-grid">
            {displayBots.map((bot) => (
              <BotCard key={bot.id} bot={bot} showAuthor={!isOwn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
