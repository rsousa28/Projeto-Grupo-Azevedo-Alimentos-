import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Map, ExternalLink, ChevronRight } from 'lucide-react';

export default function Sitemap() {
  const routes = [
    { path: '/lp-video', name: 'Main Landing Page (Video)', description: 'The primary conversion page for the product.' },
    { path: '/features', name: 'Features', description: 'Detailed breakdown of system capabilities.' },
    { path: '/pricing', name: 'Pricing', description: 'Plans and subscription options.' },
    { path: '/about', name: 'About Us', description: 'Mission and team information.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <Map className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Development Sitemap</h1>
            <p className="text-slate-500">Quick access to all application routes during preview.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {routes.map((route, index) => (
            <motion.div
              key={route.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link 
                to={route.path}
                className="group block p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {route.name}
                      </span>
                      <code className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase font-mono tracking-wider">
                        {route.path}
                      </code>
                    </div>
                    <p className="text-slate-500 text-sm">{route.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
          <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-2">Environment Info</h2>
          <div className="flex items-center gap-2 text-indigo-700 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Running in Preview Mode (HashRouter)</span>
          </div>
          <p className="mt-2 text-sm text-indigo-600/80 leading-relaxed">
            Assets are being loaded via relative paths (<code>base: './'</code>) and routing is handled via hashes to maintain compatibility with proxy environments.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
