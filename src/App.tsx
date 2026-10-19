import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { RewardsPage } from './pages/RewardsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminLeaderboardPage } from './pages/AdminLeaderboardPage';
import { AdminAttendancePage } from './pages/AdminAttendancePage';
import { ParticipantManagementPage } from './pages/ParticipantManagementPage';
import { api } from './services/api';
import type { Participant } from './types';
import './App.css';

export function App() {
  const getPageFromHash = (hash: string): string => {
    const clean = hash.replace(/^#\/?/, '').toLowerCase();
    if (clean === 'admin' || clean === 'admin-login') return 'admin-login';
    if (clean === 'admin-leaderboard' || clean === 'admin-portal' || clean === 'admin-dashboard') return 'admin-leaderboard';
    if (clean === 'admin-participants' || clean === 'participants' || clean === 'devotees') return 'admin-participants';
    if (clean === 'admin-attendance' || clean === 'attendance') return 'admin-attendance';
    if (clean === 'leaderboard' || clean === 'rankings') return 'leaderboard';
    if (clean === 'rewards') return 'rewards';
    if (clean === 'profile' || clean === 'dashboard' || clean === 'analysis') return 'profile';
    if (clean === 'login' || clean === 'signin') return 'login';
    if (clean === 'register' || clean === 'join') return 'register';
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState<string>(() => {
    if (window.location.hash) {
      return getPageFromHash(window.location.hash);
    }
    return 'home';
  });

  const [currentUser, setCurrentUser] = useState<Participant | null>(null);

  // Sync with window.location.hash
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash) {
        setCurrentPage(getPageFromHash(window.location.hash));
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Check token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          api.logout();
          setCurrentUser(null);
        });
    }
  }, []);

  const handleNavigate = (page: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    window.location.hash = page;
  };

  const handleLoginSuccess = (user: Participant) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      handleNavigate('admin-leaderboard');
    } else {
      handleNavigate('profile');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    handleNavigate('home');
  };

  const isAdminSection =
    currentPage === 'admin-leaderboard' ||
    currentPage === 'admin-participants' ||
    currentPage === 'admin-attendance';

  return (
    <div className="app-container">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        isAdminSection={isAdminSection}
      />

      <main className="main-content">
        {/* ============================================================== */}
        {/* USER SECTION PAGES                                            */}
        {/* ============================================================== */}

        {/* 1. Home Page: 3 horizontal auto-scrolling banners + sadhana entry */}
        {currentPage === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            currentUser={currentUser}
          />
        )}

        {/* 2. Leaderboard: total chanting & reading of all users + leaderboard list */}
        {currentPage === 'leaderboard' && <LeaderboardPage />}

        {/* 3. Rewards: static page showing available rewards */}
        {currentPage === 'rewards' && (
          <RewardsPage onJoinClick={() => handleNavigate(currentUser ? 'home' : 'register')} />
        )}

        {/* 4. Profile: logout button + analysis graph */}
        {currentPage === 'profile' && (
          currentUser ? (
            <ProfilePage
              currentUser={currentUser}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          ) : (
            <LoginPage
              onSuccess={handleLoginSuccess}
              onNavigateToRegister={() => handleNavigate('register')}
              onNavigateToAdminLogin={() => handleNavigate('admin-login')}
            />
          )
        )}

        {/* Authentication Pages */}
        {currentPage === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onNavigateToRegister={() => handleNavigate('register')}
            onNavigateToAdminLogin={() => handleNavigate('admin-login')}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            onSuccess={handleLoginSuccess}
            onNavigateToLogin={() => handleNavigate('login')}
          />
        )}

        {currentPage === 'admin-login' && (
          <AdminLoginPage
            onSuccess={handleLoginSuccess}
            onNavigateToUserLogin={() => handleNavigate('login')}
          />
        )}

        {/* ============================================================== */}
        {/* ADMIN SECTION PAGES                                           */}
        {/* ============================================================== */}

        {/* 1. Admin Leaderboard: filter icon for Connected Centre + pen edit for points + delete devotee */}
        {currentPage === 'admin-leaderboard' && (
          currentUser?.role === 'admin' ? (
            <AdminLeaderboardPage />
          ) : (
            <AdminLoginPage
              onSuccess={handleLoginSuccess}
              onNavigateToUserLogin={() => handleNavigate('login')}
            />
          )
        )}

        {/* 2. Admin Devotees / Participants: full management, WhatsApp reminders & delete */}
        {currentPage === 'admin-participants' && (
          currentUser?.role === 'admin' ? (
            <ParticipantManagementPage />
          ) : (
            <AdminLoginPage
              onSuccess={handleLoginSuccess}
              onNavigateToUserLogin={() => handleNavigate('login')}
            />
          )
        )}

        {/* 3. Admin Attendance: top right calendar + user checklist */}
        {currentPage === 'admin-attendance' && (
          currentUser?.role === 'admin' ? (
            <AdminAttendancePage />
          ) : (
            <AdminLoginPage
              onSuccess={handleLoginSuccess}
              onNavigateToUserLogin={() => handleNavigate('login')}
            />
          )
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
