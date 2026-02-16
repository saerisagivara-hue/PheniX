import { Link } from 'react-router-dom';
import './BotCard.css';

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

export default function BotCard({ bot, showAuthor = true, compact }) {
  const avatar = bot.avatar_url || defaultAvatar + encodeURIComponent(bot.name || 'bot');
  const chatCount = bot.chatCount ?? 0;
  const displayCount = chatCount >= 1000 ? (chatCount / 1000).toFixed(1) + 'k' : String(chatCount);

  return (
    <Link to={`/chat/${bot.id}`} className={`bot-card ${compact ? 'bot-card--compact' : ''}`}>
      <div className="bot-card__image-wrap">
        <img src={avatar} alt="" className="bot-card__avatar avatar" />
      </div>
      <div className="bot-card__body">
        <h3 className="bot-card__name">{bot.name}</h3>
        {showAuthor && (
          <p className="bot-card__author">Author: @{bot.author_username}</p>
        )}
        {bot.subtitle && (
          <p className="bot-card__subtitle">{bot.subtitle}</p>
        )}
        {bot.description && !compact && (
          <p className="bot-card__desc">{bot.description}</p>
        )}
        <div className="bot-card__meta">
          <span className="bot-card__chats">{displayCount} chats</span>
          {bot.is_public === 0 && (
            <span className="bot-card__badge bot-card__badge--private">Private</span>
          )}
        </div>
      </div>
    </Link>
  );
}
