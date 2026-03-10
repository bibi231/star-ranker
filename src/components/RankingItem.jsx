import React from 'react';
import { Link } from 'react-router-dom';

const RankingItem = ({ item }) => {
  const yesColor = 'bg-green-600';
  const noColor = 'bg-red-600';

  return (
    <Link to={`/subject/${item.id}`} className="block">
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col justify-between border border-gray-700 hover:border-blue-500 transition-colors duration-200 cursor-pointer">
        <div>
          <h3 className="text-xl font-bold text-gray-100 mb-4">{item.name}</h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Votes: {item.votes}</span>
              <div className={`text-sm font-semibold ${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change > 0 ? `+${item.change}%` : `${item.change}%`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button className={`${yesColor} text-white font-semibold py-2 px-4 rounded-md text-sm hover:bg-green-700 transition`}>
              Yes {item.yes_percent}%
            </button>
            <button className={`${noColor} text-white font-semibold py-2 px-4 rounded-md text-sm hover:bg-red-700 transition`}>
              No {item.no_percent}%
            </button>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`${yesColor} h-2.5 rounded-full`}
              style={{ width: `${item.yes_percent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RankingItem;