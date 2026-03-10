import React, { useState, useEffect } from 'react';
import RankingItem from '../components/RankingItem';
import SearchBar from '../components/SearchBar';

const mockRankings = [
  { id: 1, name: 'Fed decision in September?', votes: 1500, yes_percent: 90, no_percent: 10, change: 0.5, category: 'Politics' },
  { id: 2, name: 'New York City Mayoral Election', votes: 1450, yes_percent: 82, no_percent: 17, change: -0.2, category: 'Politics' },
  { id: 3, name: 'What will Powell say during September Press Conference?', votes: 1600, yes_percent: 89, no_percent: 11, change: 1.1, category: 'Economy' },
  { id: 4, name: 'Super Bowl Champion 2026', votes: 900, yes_percent: 18, no_percent: 13, change: 0.1, category: 'Sports' },
  { id: 5, name: 'Will Elon be no longer world\'s richest before 2026?', votes: 1300, yes_percent: 35, no_percent: 65, change: -0.8, category: 'Tech' },
  { id: 6, name: 'Will Eric Adams drop out?', votes: 1200, yes_percent: 74, no_percent: 26, change: 0.9, category: 'Politics' },
];

const HomePage = () => {
  const [rankings, setRankings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    // This is where you would connect to a real-time database
    setRankings(mockRankings);
  }, []);

  const filteredRankings = rankings.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(mockRankings.map(item => item.category))];

  return (
    <>
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRankings.length > 0 ? (
          filteredRankings.map((item) => (
            <RankingItem key={item.id} item={item} />
          ))
        ) : (
          <p className="text-gray-400 text-center py-8 col-span-full">No results found.</p>
        )}
      </div>
    </>
  );
};

export default HomePage;