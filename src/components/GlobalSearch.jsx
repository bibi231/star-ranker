/**
 * GlobalSearch Component — CMD+K global search overlay
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ items: [], users: [], categories: [] });
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const api = useApi();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // Fetch trending when opening
      api.get('/api/search/trending')
        .then(setTrending)
        .catch(() => {});
    } else {
      setQuery('');
      setResults({ items: [], users: [], categories: [] });
    }
  }, [open, api]);

  useEffect(() => {
    if (!query.trim()) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        setResults(data);
      } catch (error) {
        console.error('[GlobalSearch] Error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, api]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Search panel */}
      <div
        className="relative w-full max-w-xl bg-[#0D1B2A] rounded-2xl border border-[#C9A84C]/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <span className="text-gray-400 text-xl">??</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Search markets, items, Oracles..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-lg outline-none"
          />
          <kbd className="text-gray-600 text-xs bg-white/5 px-2 py-1 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && trending.length > 0 && (
            <div className="p-4">
              <p className="text-gray-500 text-xs font-bold uppercase mb-3">
                Trending
              </p>
              {trending.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors"
                  onClick={() => {
                    navigate(`/market/${item.id}`);
                    onClose();
                  }}
                >
                  <span className="text-[#C9A84C] font-black text-sm w-6">
                    #{item.rank}
                  </span>
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {item.categorySlug}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query && !loading && (
            <div className="p-4 space-y-4">
              {results.items.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase mb-2">
                    Items
                  </p>
                  {results.items.map((item) => (
                    <button
                      key={item.id}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        navigate(`/market/${item.id}`);
                        onClose();
                      }}
                    >
                      <span className="text-[#C9A84C] text-sm w-6">
                        #{item.rank}
                      </span>
                      <span className="text-white text-sm">{item.name}</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {item.categorySlug}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase mb-2">
                    Oracles
                  </p>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        navigate(`/oracle/${user.oracleHandle}`);
                        onClose();
                      }}
                    >
                      <span className="text-xl">??</span>
                      <span className="text-white text-sm">
                        @{user.oracleHandle}
                      </span>
                      <span className="text-[#C9A84C] text-xs ml-auto">
                        {user.reputation} rep
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.items.length === 0 && results.users.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No results for "{query}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
