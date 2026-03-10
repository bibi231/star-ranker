import React from 'react';

const AuthButtons = () => {
  return (
    <div className="flex space-x-4">
      <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
        Login
      </button>
      <button className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition">
        Sign Up
      </button>
    </div>
  );
};

export default AuthButtons;