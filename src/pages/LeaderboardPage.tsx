import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, BookOpen, Filter, ChevronDown, Check, X } from 'lucide-react';
import { api } from '../services/api';
import type { LeaderboardEntry, GlobalStats } from '../types';

export const LeaderboardPage = () => {
  const [selectedCentre, setSelectedCentre] = useState<string>('All');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leaderboardRes, statsRes] = await Promise.all([
        api.getLeaderboard(selectedCentre),
        api.getStats(),
      ]);
      setLeaderboard(leaderboardRes.leaderboard || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to fetch leaderboard or stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCentre]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = leaderboard.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.centre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      {/* Page Title & Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>

        <h1
          className="heading-editorial"
          style={{ fontSize: '2.6rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}
        >
          Kartik Challenge Leaderboard 2026
        </h1>
      </div>

      {/* 1. COMBINED TOTAL CHANTING AND READING OF ALL USERS */}
      <section className="stat-combined-glass-card">
        {/* Total Chanting */}
        <div className="stat-combined-item">
          <div className="stat-icon-wrapper">
            <span style={{ fontSize: '1.45rem' }}>📿</span>
          </div>
          <div>
            <div className="stat-value">
              {stats ? stats.totalJapaRounds.toLocaleString() : '—'}
            </div>
            <div className="stat-label">TOTAL CHANTING</div>
          </div>
        </div>

        {/* Center Divider */}
        <div className="stat-combined-divider" />

        {/* Total Reading */}
        <div className="stat-combined-item">
          <div
            className="stat-icon-wrapper"
            style={{ color: '#D97706', borderColor: 'rgba(217, 119, 6, 0.25)' }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-value">
              {stats ? stats.totalReadingMinutes.toLocaleString() : '—'}
            </div>
            <div className="stat-label">TOTAL READING (MIN)</div>
          </div>
        </div>
      </section>

      {/* 2. LEADERBOARD LIST WITH FILTER ICON & SEARCH */}
      <section className="leaderboard-table-card">
        {/* Header Toolbar: Search + Filter Icon Button + Refresh */}
        <div
          className="leaderboard-table-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              placeholder="Search devotee or centre..."
              className="input-glass"
              style={{
                padding: '0.52rem 0.85rem 0.52rem 2.3rem',
                fontSize: '0.86rem',
                width: '100%',
                background: '#FFFFFF',
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            {/* Filter Icon Button (Connected Centre) */}
            <div style={{ position: 'relative' }} ref={filterRef}>
              <button
                className="btn-glass-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.52rem 0.95rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  background: selectedCentre !== 'All' ? 'rgba(234, 88, 12, 0.12)' : '#FFFFFF',
                  borderColor: selectedCentre !== 'All' ? 'var(--primary-orange)' : 'rgba(28, 25, 23, 0.15)',
                  color: selectedCentre !== 'All' ? 'var(--primary-orange-deep)' : 'var(--text-primary)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                }}
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                title="Filter by Connected Centre"
              >
                <Filter
                  size={15}
                  color={selectedCentre !== 'All' ? '#EA580C' : 'var(--text-secondary)'}
                />
                <span>{selectedCentre === 'All' ? '' : selectedCentre}</span>
                <ChevronDown
                  size={13}
                  style={{
                    transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {/* Connected Centre Filter Menu (100% Opaque Popup) */}
              {isFilterDropdownOpen && (
                <div
                  className="animate-pop-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '210px',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(255, 122, 26, 0.28)',
                    boxShadow: '0 18px 40px -4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.55rem',
                    zIndex: 1100,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-muted)',
                      padding: '0.4rem 0.65rem 0.35rem',
                      borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Center
                  </div>

                  {['All', 'FOLK PDEU', 'FOLK Infocity', 'Local ISKCON'].map((centre) => {
                    const isSelected = selectedCentre === centre;
                    return (
                      <button
                        key={centre}
                        onClick={() => {
                          setSelectedCentre(centre);
                          setIsFilterDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: isSelected ? 'rgba(234, 88, 12, 0.1)' : 'transparent',
                          color: isSelected ? 'var(--primary-orange-deep)' : 'var(--text-primary)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <span>{centre === 'All' ? '🌟 All Centres' : centre}</span>
                        {isSelected && <Check size={14} color="#EA580C" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              className="btn-glass-secondary"
              style={{ padding: '0.52rem 0.8rem', background: '#FFFFFF' }}
              onClick={fetchData}
              title="Refresh Leaderboard"
              disabled={isLoading}
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Active Filter Indicator Badge */}
        {selectedCentre !== 'All' && (
          <div
            style={{
              padding: '0.5rem 1.25rem',
              background: 'rgba(255, 247, 237, 0.75)',
              borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: '#92400E', fontWeight: 600 }}>
              Showing devotees from <strong>{selectedCentre}</strong>
            </span>
            <button
              onClick={() => setSelectedCentre('All')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EA580C',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.78rem',
              }}
            >
              Clear <X size={13} />
            </button>
          </div>
        )}

        {/* Table Rows: <Sr No. Name of user (Connected Centre) points> */}
        <div style={{ width: '100%' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No devotees found matching your criteria.
            </div>
          ) : (
            filtered.map((user) => {
              const isPodium = user.rank <= 3;
              const rankClass =
                user.rank === 1
                  ? 'rank-1'
                  : user.rank === 2
                    ? 'rank-2'
                    : user.rank === 3
                      ? 'rank-3'
                      : 'rank-other';

              return (
                <div key={user.participantId} className="leaderboard-row">
                  {/* Sr No. */}
                  <div>
                    <div className={`rank-badge ${rankClass}`}>
                      {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                    </div>
                  </div>

                  {/* Name of user (Connected Centre) */}
                  <div className="user-info-col">
                    <div className="user-name-line">
                      <span>{user.name}</span>
                      <span className="connected-centre-badge">({user.centre})</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {user.totalChallengeRounds} rounds • {user.totalReadingMinutes} min reading
                      {isPodium && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--primary-orange)', fontWeight: 700 }}>
                          • {user.rank === 1 ? '100% Mayapur + Hoodie' : user.rank === 2 ? '75% Mayapur + Hoodie' : '50% Mayapur + Hoodie'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="points-pill">
                    <span>{user.totalPoints}</span>
                    <span className="points-label">pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
