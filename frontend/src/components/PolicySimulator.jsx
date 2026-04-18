import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const PolicySimulator = ({ district, village }) => {
  const [query, setQuery] = useState('');
  const model = 'composite_index_lasso';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/simulate-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model, district, village })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to simulate policy');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 my-8">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">AI Policy Simulator</h2>
      <p className="text-gray-600 mb-6">
        Describe a scenario in plain English (e.g., "Build 2 new primary schools and a health centre"), and our ML framework will predict its impact on the village development index.
      </p>

      <form onSubmit={handleSimulate} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Description</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              placeholder="E.g., Construct 10 km of pucca roads and add 1 hospital..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          
        </div>
        
        <button
          type="submit"
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          disabled={loading || !query.trim()}
        >
          {loading ? (
             <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Simulating...
             </span>
          ) : 'Simulate Policy Impact'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
          <div className="p-4 bg-green-600 text-white flex justify-between items-center">
            <h3 className="text-lg font-semibold">Simulation Report</h3>
            <span className="bg-green-800 px-3 py-1 rounded-full text-sm">
              Model: {result.model_used.replace('composite_index_', '')}
            </span>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-4 rounded shadow-sm text-center border border-gray-100">
                <span className="block text-gray-500 text-sm font-semibold uppercase mb-1">Original Baseline</span>
                <span className="text-3xl font-bold text-gray-700">{result.original_score.toFixed(2)}</span>
              </div>
              
              <div className="bg-white p-4 rounded shadow-sm text-center border border-gray-100">
                <span className="block text-gray-500 text-sm font-semibold uppercase mb-1">New Predicted Score</span>
                <span className="text-3xl font-bold text-blue-600">{result.new_score.toFixed(2)}</span>
              </div>
              
              <div className="bg-white p-4 rounded shadow-sm text-center border border-gray-100">
                <span className="block text-gray-500 text-sm font-semibold uppercase mb-1">Index Impact</span>
                <span className={`text-3xl font-bold ${result.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {result.change >= 0 ? '+' : ''}{result.change.toFixed(3)}
                  <span className="text-sm ml-1">({result.percent_change >= 0 ? '+' : ''}{result.percent_change.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-2 border-b pb-1">AI Analysis</h4>
              <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {result.analysis}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-2 border-b pb-1">Data Modifications Applied</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(result.mapped_modifications).map(([key, val]) => (
                  <span key={key} className="inline-flex items-center px-3 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                    <span className="font-mono mr-2">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-bold">{val > 0 ? `+${val}` : val}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicySimulator;