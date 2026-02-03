import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="w-full bg-[#0d0e14] border-b border-gray-800 py-4 px-8 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-3xl font-extrabold text-blue-500">StarRanker</Link>
          <nav className="hidden md:flex space-x-4 text-gray-400 font-semibold">
            <a href="#" className="hover:text-white transition">Trending</a>
            <a href="#" className="hover:text-white transition">Politics</a>
            <a href="#" className="hover:text-white transition">Sports</a>
            <a href="#" className="hover:text-white transition">Crypto</a>
          </nav>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <button className="px-4 py-2 rounded-md font-semibold text-gray-200 hover:bg-gray-800 transition">Log In</button>
          <button className="px-4 py-2 rounded-md font-semibold bg-blue-600 text-white hover:bg-blue-700 transition">Sign Up</button>
        </div>
      </div>
    </header>
  );
};

export default Header;