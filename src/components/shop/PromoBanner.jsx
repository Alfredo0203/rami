import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PromoBanner() {
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0] || {}),
    staleTime: 60_000,
  });

  // Don't render if explicitly disabled
  if (settings && settings.promo_banner_enabled === false) return null;

  const label = settings?.promo_banner_label || 'Flash Sale';
  const title = settings?.promo_banner_title || 'Up to 70% OFF';
  const subtitle = settings?.promo_banner_subtitle || '';
  const link = settings?.promo_banner_link || '';
  const imageUrl = settings?.promo_banner_image_url || '';

  const handleTap = () => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 my-3 rounded-2xl overflow-hidden relative"
      style={{
        background: imageUrl
          ? `url(${imageUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))',
        cursor: link ? 'pointer' : 'default',
      }}
      onClick={handleTap}
    >
      {/* decorative circles */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      {/* dark overlay when image is set */}
      {imageUrl && <div className="absolute inset-0 bg-black/40" />}

      <div className="relative p-5">
        {/* Label badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#1a237e] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm mb-2">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          {label}
        </div>
        {/* Title block */}
        <div className="bg-[#1a237e] inline-block px-3 py-1.5 rounded-sm mb-1">
          <h2 className="text-white text-2xl font-extrabold leading-tight">{title}</h2>
        </div>
        {/* Subtitle */}
        {subtitle && (
          <p className="text-white/90 text-sm font-medium mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}