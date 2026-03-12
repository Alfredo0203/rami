import React, { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  }, [pullDistance, onRefresh]);

  const indicatorVisible = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {indicatorVisible && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: refreshing ? 48 : pullDistance, overflow: 'hidden' }}
        >
          <Loader2
            className={`w-5 h-5 text-primary transition-all ${refreshing ? 'animate-spin' : ''}`}
            style={{ opacity: refreshing ? 1 : pullDistance / THRESHOLD }}
          />
        </div>
      )}
      {children}
    </div>
  );
}