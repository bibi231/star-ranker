/**
 * MarketRulebook Component
 * Displays resolution rules for each market category
 */

import React, { useState } from 'react';

const RULEBOOKS = {
  crypto: {
    title: 'Crypto Assets',
    dataSource: 'CoinGecko API (updated every 5 minutes)',
    resolutionCriteria:
      'Items ranked by market capitalisation in USD at epoch close timestamp. The rank at exactly HH:MM:00 at epoch close is the final rank.',
    updateFrequency: 'Recalculated every 5 minutes via CoinGecko',
    edgeCases: [
      'CoinGecko unavailable at close: last price within 30 minutes prior is used',
      'Ties in market cap: broken by 24-hour trading volume',
      'New tokens entering top 100 mid-epoch: ranked by market cap at epoch close',
    ],
  },
  music: {
    title: 'Music Artists',
    dataSource: 'Community vote momentum (collective Oracle intelligence)',
    resolutionCriteria:
      'Items ranked by accumulated momentum score at epoch close. Momentum calculated from up/down votes weighted by Oracle reputation and power votes.',
    updateFrequency: 'Recalculated every 60 seconds',
    edgeCases: [
      'Ties in momentum: broken by total vote count',
      'Votes from flagged accounts: may be excluded at platform discretion',
      'New artists can enter at any time based on vote accumulation',
    ],
  },
  smartphones: {
    title: 'Smartphones',
    dataSource: 'Community vote momentum',
    resolutionCriteria:
      'Same as Music — vote-based momentum ranking settled at epoch close',
    updateFrequency: 'Every 60 seconds',
    edgeCases: [
      'Ties broken by vote count',
      'New releases can be nominated by Oracles',
    ],
  },
  tech: {
    title: 'Tech Companies',
    dataSource: 'Community vote momentum',
    resolutionCriteria:
      'Vote-based momentum ranking. Companies ranked by collective Oracle vote weight at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['Ties broken by vote count'],
  },
  athletes: {
    title: 'Athletes',
    dataSource: 'Community vote momentum',
    resolutionCriteria:
      'Athletes ranked by collective Oracle vote weight at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: [
      'Suspended/injured athletes retain their ranking unless explicitly moved by votes',
    ],
  },
  fashion: {
    title: 'Fashion & Brands',
    dataSource: 'Community vote momentum',
    resolutionCriteria: 'Brands ranked by vote momentum at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['Ties broken by total vote count'],
  },
  movies: {
    title: 'Movies & TV',
    dataSource: 'Community vote momentum',
    resolutionCriteria: 'Titles ranked by vote momentum at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['New releases can enter rankings at any time'],
  },
  games: {
    title: 'Video Games',
    dataSource: 'Community vote momentum',
    resolutionCriteria: 'Games ranked by vote momentum at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['Ties broken by vote count'],
  },
  creators: {
    title: 'Creators & Influencers',
    dataSource: 'Community vote momentum',
    resolutionCriteria:
      'Creators ranked by vote momentum at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['Deactivated accounts retain last ranking position'],
  },
  zeitgeist: {
    title: 'Cultural Zeitgeist',
    dataSource: 'Community vote momentum',
    resolutionCriteria:
      'Cultural items ranked by vote momentum at epoch close.',
    updateFrequency: 'Every 60 seconds',
    edgeCases: ['Broad category — any cultural phenomenon can be nominated'],
  },
};

export default function MarketRulebook({ categorySlug, onClose }) {
  const rulebook = RULEBOOKS[categorySlug] || RULEBOOKS.crypto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0D1B2A] rounded-3xl border border-[#C9A84C]/40 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0D1B2A] border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">{rulebook.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">
              Data Source
            </p>
            <p className="text-white">{rulebook.dataSource}</p>
          </div>

          <div>
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">
              Resolution Criteria
            </p>
            <p className="text-white">{rulebook.resolutionCriteria}</p>
          </div>

          <div>
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">
              Update Frequency
            </p>
            <p className="text-white">{rulebook.updateFrequency}</p>
          </div>

          <div>
            <p className="text-gray-500 text-xs font-bold uppercase mb-3">
              Edge Cases & Tie-breaking
            </p>
            <ul className="space-y-2">
              {rulebook.edgeCases.map((edge, idx) => (
                <li key={idx} className="text-white text-sm flex gap-2">
                  <span className="text-[#C9A84C] flex-shrink-0">•</span>
                  <span>{edge}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-[#0D1B2A] border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full bg-[#C9A84C] text-[#0D1B2A] font-black py-3 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
