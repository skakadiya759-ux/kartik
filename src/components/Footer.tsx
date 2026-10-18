import { Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 122, 26, 0.15)',
        background: 'rgba(255, 251, 247, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '2.25rem 1.5rem',
        marginTop: '3.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
          <span>© 2026 Kartik Challenge • Hare Krishna Movement</span>
          <a
            href="#admin-login"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              opacity: 0.35,
              fontSize: '0.75rem',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.35')}
            title="Administrator Portal"
          >
            Admin Gate
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
          <span>Crafted with devotion</span>
          <Heart size={14} color="#EA580C" fill="#EA580C" />
          <span>in the service of Krishna</span>
        </div>
      </div>
    </footer>
  );
};
