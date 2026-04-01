import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/storeModel';
import { apiGet, apiPost, apiDelete } from '../lib/api';

/**
 * Hook to manage user's market watchlist/bookmarks.
 * Centralizes the fetching and toggling logic.
 */
export function useWatchlist() {
  const user = useStore(state => state.user);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
        setWatchlist([]);
        return;
    }
    setLoading(true);
    try {
      // apiGet automatically attaches the Firebase ID token
      const data = await apiGet('/api/watchlist');
      if (data && data.watchlist) {
        setWatchlist(data.watchlist);
      }
    } catch (err) {
      console.error("[Watchlist] Failed to load:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const toggleWatchlist = async (itemId) => {
    if (!user) return;
    
    const isTracked = watchlist.some(w => w.itemDocId === itemId);
    
    // Optimistic UI update
    const previousWatchlist = [...watchlist];
    if (isTracked) {
        setWatchlist(prev => prev.filter(w => w.itemDocId !== itemId));
    } else {
        // Temporary partial object until refresh
        setWatchlist(prev => [...prev, { itemDocId: itemId, item: { docId: itemId, name: "Loading..." } }]);
    }

    try {
      if (isTracked) {
        await apiDelete(`/api/watchlist/${itemId}`);
      } else {
        await apiPost(`/api/watchlist/${itemId}`);
      }
      
      // Secondary fetch to get the full joined 'item' details (description, rank, etc)
      fetchWatchlist();
    } catch (err) {
      console.error("[Watchlist] Toggle failed:", err.message);
      // Revert UI on failure
      setWatchlist(previousWatchlist);
    }
  };

  const isTrackedInList = useCallback((itemId) => {
    return watchlist.some(w => w.itemDocId === itemId);
  }, [watchlist]);

  return { 
    watchlist, 
    loading, 
    toggleWatchlist, 
    isTracked: isTrackedInList, 
    fetchWatchlist 
  };
}
