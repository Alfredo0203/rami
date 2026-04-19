import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULTS = {
  badge_text: 'Flash Sale',
  title: 'Up to 70% OFF',
  subtitle: 'Created by Alfred & Raquel',
};

export default function PromoBanner({ banner }) {
  const navigate = useNavigate();
  const cfg = { ...DEFAULTS, ...banner };

  const handleClick = () => {
    if (cfg.link_url) {
      if (cfg.link_url.startsWith('/')) navigate(cfg.link_url);
      else window.open(cfg.link_url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      className={`mx-4 my-3 rounded-2xl overflow-hidden relative ${cfg.link_url ? 'cursor-pointer' : ''}`}
      style={{ background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))' }}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      <div className="relative p-5 flex items-center justify-between">
        <div>
          {cfg.badge_text && (
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4 text-primary-foreground" />
              <span className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider">{cfg.badge_text}</span>
            </div>
          )}
          {cfg.title && <h2 className="text-primary-foreground text-xl font-extrabold">{cfg.title}</h2>}
          {cfg.subtitle && <p className="text-primary-foreground/70 text-xs mt-0.5">{cfg.subtitle}</p>}
        </div>
        <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-full p-3">
          <ArrowRight className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  );
}