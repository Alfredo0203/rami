import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

const DEFAULTS = {
  promo_banner_label: 'Flash Sale',
  promo_banner_title: 'Up to 70% OFF',
  promo_banner_subtitle: 'Created by Alfred & Raquel',
  promo_banner_link: '',
  promo_banner_enabled: true,
};

export default function PromoBanner() {
  const navigate = useNavigate();
  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0] || {}),
    staleTime: 60_000,
  });

  const s = settings || {};
  const label    = s.promo_banner_label    ?? DEFAULTS.promo_banner_label;
  const title    = s.promo_banner_title    ?? DEFAULTS.promo_banner_title;
  const subtitle = s.promo_banner_subtitle ?? DEFAULTS.promo_banner_subtitle;
  const link     = s.promo_banner_link     ?? DEFAULTS.promo_banner_link;
  const enabled  = s.promo_banner_enabled  ?? DEFAULTS.promo_banner_enabled;

  if (!enabled) return null;

  const handleClick = () => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate('/' + link.replace(/^\//, ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      className={`mx-4 my-3 rounded-2xl overflow-hidden relative${link ? ' cursor-pointer' : ''}`}
      style={{
        background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))'
      }}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      <div className="relative p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-primary-foreground" />
            <span className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider">{label}</span>
          </div>
          <h2 className="text-primary-foreground text-xl font-extrabold">{title}</h2>
          {subtitle ? <p className="text-primary-foreground/70 text-xs mt-0.5">{subtitle}</p> : null}
        </div>
        <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-full p-3">
          <ArrowRight className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  );
}