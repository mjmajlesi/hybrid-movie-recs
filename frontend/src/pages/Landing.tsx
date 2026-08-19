import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Film, Tv, Sparkles, Star, TrendingUp, Brain } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Hybrid AI Engine',
    description: 'Collaborative filtering + content-based + quality scoring combined into one smart recommendation.',
  },
  {
    icon: Sparkles,
    title: 'Personalized Picks',
    description: 'Rate a few movies and shows you love — our model learns your taste instantly.',
  },
  {
    icon: Film,
    title: '87,000+ Movies',
    description: 'From blockbusters to cult classics — powered by MovieLens 32M dataset.',
  },
  {
    icon: Tv,
    title: '4,200+ TV Shows',
    description: 'Discover binge-worthy series curated just for you.',
  },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 pt-20 pb-32 text-center">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-700/50 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-8">
            <Sparkles size={14} />
            Powered by AI · Content + Collaborative Filtering
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Discover Your Next
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Favorite Movie
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            A hybrid recommendation engine that learns what you like — combining
            collaborative filtering, content analysis, and quality metrics into
            one personalized feed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/onboarding')}
              size="lg"
              className="px-8 py-3.5 text-lg shadow-lg shadow-purple-900/50"
            >
              <Star className="mr-2" size={20} />
              Rate & Get Started
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/home')}
              size="lg"
              className="px-8 py-3.5 text-lg"
            >
              <TrendingUp className="mr-2" size={20} />
              See Recommendations
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-32">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why <span className="text-purple-400">Reel</span> Recommendation Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-800/40 transition-colors">
                <f.icon size={24} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-gray-500 text-sm">
        Built with FastAPI + React + Tailwind · MovieLens 32M Dataset
      </footer>
    </div>
  );
};

export default Landing;