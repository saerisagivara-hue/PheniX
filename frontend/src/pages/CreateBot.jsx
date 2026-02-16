import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bots as botsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './CreateBot.css';

export default function CreateBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const bot = await botsApi.create({
        name: name.trim(),
        description: description.trim(),
        subtitle: subtitle.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        prompt: prompt.trim() || undefined,
        is_public: isPublic,
      });
      navigate(`/chat/${bot.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create bot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container page create-bot-page">
      <div className="nav-spacer" />
      <div className="create-bot-card">
        <h1>Create a character</h1>
        <p className="create-bot-sub">Add a name, description, and choose whether to publish it for everyone.</p>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              required
            />
          </div>
          <div className="form-group">
            <label>Subtitle (short trait or mood)</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Kind and protective"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How this character behaves, backstory..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Avatar image URL (optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>Prompt / personality (optional, for future AI)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Short prompt describing how the bot should respond..."
              rows={2}
            />
          </div>
          <div className="form-group form-group--row">
            <input
              type="checkbox"
              id="is_public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="is_public">Make this character public (visible on the main page for everyone)</label>
          </div>
          <p className="create-bot-hint">
            If you leave this unchecked, only you will see the character on your profile.
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating...' : 'Create character'}
          </button>
        </form>
      </div>
    </div>
  );
}
