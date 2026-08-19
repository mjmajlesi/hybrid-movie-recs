import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import RatingsPage from './pages/RatingsPage';
import DetailPage from './pages/DetailPage';
import { Star, Search, Home as HomeIcon, Bookmark } from 'lucide-react';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  const isLanding = path === '/';
  const isOnboarding = path === '/onboarding';
  const isHome = path === '/home';
  const isRatings = path === '/ratings';
  const isDetail = path.startsWith('/movie/') || path.startsWith('/show/');

  // Landing has no nav
  if (isLanding) return <Landing />;

  const navBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/40'
        : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
    }`;

  const page = isDetail ? (
    <DetailPage key={path} />
  ) : isHome ? (
    <Home />
  ) : isRatings ? (
    <RatingsPage />
  ) : (
    <Onboarding />
  );

  return (
    <>
      <div className="min-h-screen pb-20">{page}</div>
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50 py-3 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-center gap-2 sm:gap-3">
          <button onClick={() => navigate('/')} className={navBtn(isLanding)}>
            <HomeIcon size={18} />
            <span>Home</span>
          </button>
          <button onClick={() => navigate('/onboarding')} className={navBtn(isOnboarding)}>
            <Search size={18} />
            <span>Discover</span>
          </button>
          <button onClick={() => navigate('/home')} className={navBtn(isHome)}>
            <Star size={18} />
            <span>For You</span>
          </button>
          <button onClick={() => navigate('/ratings')} className={navBtn(isRatings)}>
            <Bookmark size={18} />
            <span>My Ratings</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default App;