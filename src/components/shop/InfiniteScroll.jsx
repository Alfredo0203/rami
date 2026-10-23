import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export default function InfiniteScroll({ 
  items = [], 
  renderItem, 
  onLoadMore, 
  isLoading = false,
  hasMore = true,
  threshold = 500 
}) {
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore?.();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {items.map((item, i) => (
          <div key={item.id}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {(hasMore || isLoading) && (
        <div ref={observerTarget} className="flex justify-center py-6">
          {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>
      )}
    </>
  );
}