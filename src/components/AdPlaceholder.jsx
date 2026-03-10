import React from 'react';

const AdPlaceholder = ({ position }) => {
  const positionClasses = {
    left: "w-full h-24 lg:w-48 lg:h-auto bg-gray-200 lg:p-4 mb-4 lg:mb-0 hidden lg:block",
    right: "w-full h-24 lg:w-48 lg:h-auto bg-gray-200 lg:p-4 mt-4 lg:mt-0 hidden lg:block",
    bottom: "w-full h-24 bg-gray-200 p-4 mt-4 lg:hidden"
  };

  return (
    <div className={`flex justify-center items-center ${positionClasses[position]}`}>
      <span className="text-gray-500 text-center">Ad Placement Area</span>
    </div>
  );
};

export default AdPlaceholder;