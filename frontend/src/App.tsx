import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import RatingsPage from './pages/RatingsPage';
import DetailPage from './pages/DetailPage';
import { Star, Search, Bookmark } from 'lucide-react';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const path = location.pathname;
  const isLanding = path === '/';
  const isOnboarding = path === '/onboarding';
  const isHome = path === '/home';
  const isRatings = path === '/ratings';
  const isDetail = path.startsWith('/movie/') || path.startsWith('/show/');
  const u = params.get('u') || '1';

  // Landing has no nav
  if (isLanding) return <Landing />;

  const navBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
      active
        ? 'text-white bg-slate-800/80'
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
      <nav className="fixed bottom-0 inset-x-0 backdrop-blur-xl border-t border-slate-800 bg-black/70 py-3 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-center gap-2 sm:gap-3">
          <button onClick={() => navigate(`/onboarding?u=${u}`)} className={navBtn(isOnboarding)}>
            <Search size={18} />
            <span>Discover</span>
          </button>
          <button onClick={() => navigate(`/home?u=${u}`)} className={navBtn(isHome)}>
            <Star size={18} />
            <span>For You</span>
          </button>
          <button onClick={() => navigate(`/ratings?u=${u}`)} className={navBtn(isRatings)}>
            <Bookmark size={18} />
            <span>My Ratings</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default App;