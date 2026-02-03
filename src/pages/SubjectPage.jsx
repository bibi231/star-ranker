import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const mockSubjectDetails = {
  1: { title: 'Fed Decision in September?', description: 'This is the page for the Fed decision.', details: 'Details about this event...', link: 'https://polymarket.com/market/fed-decision-in-september' },
  // Add other subjects here with unique IDs
};

const SubjectPage = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);

  useEffect(() => {
    // Fetch data for the specific subject using the ID
    const foundSubject = mockSubjectDetails[id];
    setSubject(foundSubject);
  }, [id]);

  if (!subject) {
    return <div className="text-center text-xl mt-12">Subject not found.</div>;
  }

  return (
    <div className="bg-gray-900 p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-white mb-4">{subject.title}</h1>
      <p className="text-gray-400 mb-6">{subject.description}</p>
      <div className="space-y-4">
        <p className="text-gray-300">{subject.details}</p>
        <Link
          to={subject.link}
          target="_blank"
          className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition"
        >
          View More Info
        </Link>
      </div>
    </div>
  );
};

export default SubjectPage;