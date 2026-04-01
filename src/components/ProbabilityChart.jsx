/**
 * ProbabilityChart Component
 * Displays historical probability movement for an item
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useApi } from '../lib/api';

export default function ProbabilityChart({ itemId, currentProbability = 50 }) {
  const [data, setData] = useState([]);
  const [timeframe, setTimeframe] = useState('24h');
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const hours = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[timeframe];
        const response = await api.get(
          `/api/items/${itemId}/probability-history?hours=${hours}`
        );

        if (!cancelled) {
          setData(response || []);
          setLoading(false);
        }
      } catch (error) {
        console.error('[ProbabilityChart] Error:', error);
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [itemId, timeframe, api]);

  return (
    <div className="bg-[#0D1B2A] rounded-2xl p-4 border border-white/10">
      {/* Timeframe selector */}
      <div className="flex gap-2 mb-4">
        {['1h', '6h', '24h', '7d'].map((t) => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              timeframe === t
                ? 'bg-[#C9A84C] text-[#0D1B2A]'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="animate-pulse bg-white/5 rounded-xl h-40 w-full" />
      )}

      {!loading && data.length === 0 && (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500 text-sm">
            Chart data builds after first settled epoch
          </p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                background: '#1E3A5F',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => [`${v}%`, 'Win Probability']}
            />
            <ReferenceLine
              y={50}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="impliedProbability"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#C9A84C' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex justify-between mt-2">
        <span className="text-gray-500 text-xs">Current probability</span>
        <span className="text-[#C9A84C] font-bold text-xs">
          {currentProbability}%
        </span>
      </div>
    </div>
  );
}
