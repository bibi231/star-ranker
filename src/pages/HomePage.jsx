import React, { useState, useEffect } from 'react';
import RankingItem from '../components/RankingItem';
import SearchBar from '../components/SearchBar';

const HomePage = () => {
  const [rankings, setRankings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { apiGet } = await import('../lib/api');
        const data = await apiGet('/api/items');
        setRankings(data || []);
      } catch (err) {
        console.error("Failed to fetch items for home page", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredRankings = rankings.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.categorySlug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(rankings.map(item => item.categorySlug).filter(Boolean))];

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