import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Trophy,
  Award,
  User,
  LogIn,
  Shield,
  CheckCircle2,
  Home,
  ChevronDown,
  TrendingUp,
  UserCheck,
  LogOut,
  X,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import type { Participant } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: Participant | null;
  onLogout: () => void;
  isAdminSection?: boolean;
}

export const Navbar = ({
  currentPage,
  onNavigate,
  currentUser,
  onLogout,
  isAdminSection = false,
}: NavbarProps) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProfileDropdownOpen((prev) => !prev);
  };

  const handleAdminOption = () => {
    setIsProfileDropdownOpen(false);
    if (isAdminSection) {
      onNavigate('home');
    } else {
      onNavigate('admin-leaderboard');
    }
  };

  const handleAnalyticsOption = () => {
    setIsProfileDropdownOpen(false);
    onNavigate('profile');
    setTimeout(() => {
      const el = document.getElementById('analytics-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleAboutMeOption = () => {
    setIsProfileDropdownOpen(false);
    setIsAboutModalOpen(true);
  };

  const handleLogoutOption = () => {
    setIsProfileDropdownOpen(false);
    if (currentUser) {
      onLogout();
    } else {
      onNavigate('login');
    }
  };

  return (
    <>
      {/* Sticky Top Header (Used on Both Desktop & Mobile) */}
      <header className="navbar-glass">
        <div className="navbar-inner">
          {/* Logo Brand */}
          <div className="brand-link" onClick={() => onNavigate('home')}>
            <div className="brand-icon-box">
              <Sparkles size={19} />
            </div>
            <div className="brand-text">
              <span>Kartik Challenge</span>
              <span className="brand-subtext">2026 • Japa &amp; Shravanam</span>
            </div>
          </div>

          {/* Navigation Tabs (Top Sticky Pill Bar on Desktop & Mobile) */}
          <nav className="nav-center-tabs">
            {isAdminSection ? (
              // Admin Section Tabs
              <>
                <button
                  className={`nav-tab-link ${currentPage === 'admin-leaderboard' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-leaderboard')}
                >
                  <Trophy size={14} />
                  <span>Leaderboard</span>
                </button>
                <button
                  className={`nav-tab-link ${currentPage === 'admin-attendance' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-attendance')}
                >
                  <CheckCircle2 size={14} />
                  <span>Attendance</span>
                </button>
                <button
                  className="nav-tab-link"
                  onClick={() => onNavigate('home')}
                >
                  <Home size={14} />
                  <span>User Mode</span>
                </button>
              </>
            ) : (
              // User Section Tabs
              <>
                <button
                  className={`nav-tab-link ${currentPage === 'home' ? 'active' : ''}`}
                  onClick={() => onNavigate('home')}
                >
                  <Home size={14} />
                  <span>Home</span>
                </button>
                <button
                  className={`nav-tab-link ${currentPage === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => onNavigate('leaderboard')}
                >
                  <Trophy size={14} />
                  <span className="tab-label-full">Leaderboard</span>
                  <span className="tab-label-short">Board</span>
                </button>
                <button
                  className={`nav-tab-link ${currentPage === 'rewards' ? 'active' : ''}`}
                  onClick={() => onNavigate('rewards')}
                >
                  <Award size={14} />
                  <span>Rewards</span>
                </button>

                {/* Profile Section with Dropdown Trigger */}
                <div className="nav-profile-wrapper" ref={profileDropdownRef}>
                  <button
                    className={`nav-tab-link ${currentPage === 'profile' ? 'active' : ''} ${isProfileDropdownOpen ? 'dropdown-open' : ''}`}
                    onClick={handleProfileClick}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}
                  >
                    <User size={14} />
                    <span>Profile</span>
                    <ChevronDown
                      size={12}
                      style={{
                        transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="profile-dropdown-glass animate-pop-in">
                      {/* User Header in Dropdown */}
                      {currentUser && (
                        <div className="profile-dropdown-header">
                          <div className="profile-dropdown-avatar">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div className="profile-dropdown-name">{currentUser.name}</div>
                            <div className="profile-dropdown-sub">{currentUser.centre}</div>
                          </div>
                        </div>
                      )}

                      <div className="profile-dropdown-menu-list">
                        {/* Option a: Admin Section */}
                        <button
                          className="profile-dropdown-item"
                          onClick={handleAdminOption}
                        >
                          <div className="profile-dropdown-icon-box" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#EA580C' }}>
                            <Shield size={15} />
                          </div>
                          <div>
                            <div className="dropdown-item-title">
                              {isAdminSection ? 'Switch to User View' : 'Admin Section'}
                            </div>
                          </div>
                        </button>

                        {/* Option b: Analytics */}
                        <button
                          className="profile-dropdown-item"
                          onClick={handleAnalyticsOption}
                        >
                          <div className="profile-dropdown-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                            <TrendingUp size={15} />
                          </div>
                          <div>
                            <div className="dropdown-item-title">Analytics</div>
                          </div>
                        </button>

                        {/* Option c: About Me */}
                        <button
                          className="profile-dropdown-item"
                          onClick={handleAboutMeOption}
                        >
                          <div className="profile-dropdown-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' }}>
                            <UserCheck size={15} />
                          </div>
                          <div>
                            <div className="dropdown-item-title">About Me</div>
                          </div>
                        </button>

                        <div className="profile-dropdown-divider" />

                        {/* Option d: Logout */}
                        <button
                          className="profile-dropdown-item dropdown-logout-item"
                          onClick={handleLogoutOption}
                        >
                          <div className="profile-dropdown-icon-box" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
                            <LogOut size={15} />
                          </div>
                          <div>
                            <div className="dropdown-item-title" style={{ color: '#DC2626' }}>
                              {currentUser ? 'Log Out' : 'Sign In'}
                            </div>
                            <div className="dropdown-item-desc">
                              {currentUser ? 'End current session' : 'Access your account'}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* About Me Modal Dialog (Portaled to document.body for true viewport centering) */}
      {isAboutModalOpen &&
        createPortal(
          <div className="modal-backdrop animate-fade-in" onClick={() => setIsAboutModalOpen(false)}>
            <div
              className="about-modal-card glass-panel animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="about-modal-header">
                <span className="glass-pill" style={{ margin: 0 }}>
                  <Sparkles size={13} color="#EA580C" />
                  Devotee Profile Details
                </span>
                <button
                  className="btn-modal-close"
                  onClick={() => setIsAboutModalOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {currentUser ? (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div className="about-modal-avatar">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.65rem', marginBottom: '0.2rem' }}>
                      {currentUser.name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-orange-deep)', fontWeight: 700 }}>
                      {currentUser.centre}
                    </div>
                  </div>

                  <div className="about-modal-info-grid">
                    <div className="about-info-item">
                      <span className="about-info-label">
                        <Phone size={14} color="#EA580C" /> Mobile
                      </span>
                      <span className="about-info-val">{currentUser.mobile}</span>
                    </div>
                    <div className="about-info-item">
                      <span className="about-info-label">
                        <MapPin size={14} color="#EA580C" /> Centre
                      </span>
                      <span className="about-info-val">{currentUser.centre}</span>
                    </div>
                    <div className="about-info-item">
                      <span className="about-info-label">
                        <Shield size={14} color="#EA580C" /> Role
                      </span>
                      <span className="about-info-val" style={{ textTransform: 'capitalize' }}>
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="about-info-item">
                      <span className="about-info-label">
                        <Calendar size={14} color="#EA580C" /> Registered
                      </span>
                      <span className="about-info-val">
                        {new Date(currentUser.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      className="btn-glass-primary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setIsAboutModalOpen(false);
                        onNavigate('profile');
                      }}
                    >
                      View Full Sadhana Profile
                    </button>
                    <button
                      className="btn-glass-secondary"
                      onClick={() => {
                        setIsAboutModalOpen(false);
                        onLogout();
                      }}
                      style={{ color: '#DC2626' }}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                    You are currently browsing as a guest. Sign in to view your complete profile and track your sadhana.
                  </p>
                  <button
                    className="btn-glass-primary"
                    onClick={() => {
                      setIsAboutModalOpen(false);
                      onNavigate('login');
                    }}
                  >
                    <LogIn size={15} />
                    Sign In / Register
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
