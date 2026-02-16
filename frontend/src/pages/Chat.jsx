import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bots as botsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    Promise.all([botsApi.get(id), botsApi.messages(id)])
      .then(([botData, msgData]) => {
        setBot(botData);
        setMessages(msgData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, user, navigate]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const { assistantMessage } = await botsApi.sendMessage(id, text);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to send. Try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    try {
      await botsApi.like(id);
      setBot((b) => b ? { ...b, isLiked: !b.isLiked } : null);
    } catch {}
  };

  if (loading) return <div className="chat-page"><div className="nav-spacer" /><p>Loading...</p></div>;
  if (!bot) return <div className="chat-page"><div className="nav-spacer" /><p>Character not found.</p></div>;

  const avatar = bot.avatar_url || defaultAvatar + encodeURIComponent(bot.name);

  return (
    <div className="chat-page">
      <div className="nav-spacer" />
      <header className="chat-header">
        <Link to="/" className="chat-back">← Back</Link>
        <div className="chat-header-bot">
          <img src={avatar} alt="" className="avatar avatar-md chat-header-avatar" />
          <div>
            <h1 className="chat-header-name">{bot.name}</h1>
            <p className="chat-header-author">Author: @{bot.author_username}</p>
          </div>
        </div>
        {bot.subtitle && <p className="chat-header-subtitle">{bot.subtitle}</p>}
        <button type="button" className="chat-like" onClick={toggleLike} title={bot.isLiked ? 'Unlike' : 'Like'}>
          {bot.isLiked ? '❤️' : '🤍'}
        </button>
      </header>

      <div className="chat-intro">
        {bot.description && <p className="chat-intro-desc">{bot.description}</p>}
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.role === 'assistant' && (
              <img src={avatar} alt="" className="avatar avatar-sm chat-bubble-avatar" />
            )}
            <div className="chat-bubble-content">
              {m.role === 'assistant' && <span className="chat-bubble-name">{bot.name}</span>}
              <p>{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${bot.name}...`}
          className="chat-input"
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary chat-send" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>

      <p className="chat-disclaimer">This is AI, not a real person. Consider everything said as fiction.</p>
    </div>
  );
}
