import { useState, useEffect } from 'react';
import { bots } from '../api';
import BotCard from '../components/BotCard';
import './Home.css';

export default function Home() {
  const [botList, setBotList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    bots.list().then((data) => {
      setBotList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? botList.filter(
        (b) =>
          b.name?.toLowerCase().includes(search.toLowerCase()) ||
          b.author_username?.toLowerCase().includes(search.toLowerCase())
      )
    : botList;

  return (
    <div className="app-container page home-page">
      <div className="nav-spacer" />
      <div className="home-search">
        <span className="home-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search characters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="home-search-input"
        />
      </div>

      <h2 className="section-title">For you</h2>
      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="bots-row">
          {filtered.slice(0, 12).map((bot) => (
            <div key={bot.id} className="bot-card-wrap">
              <BotCard bot={bot} compact />
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Characters</h2>
      {!loading && (
        <div className="bots-grid">
          {filtered.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <p className="text-muted">No characters yet. Create one or try another search.</p>
      )}
    </div>
  );
}
