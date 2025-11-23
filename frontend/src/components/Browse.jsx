import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, MapPinIcon, ChevronRightIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import AgricultureAnalytics from './AgricultureAnalytics';
import EducationAnalytics from './EducationAnalytics';
import HealthAnalytics from './HealthAnalytics';
import InfrastructureAnalytics from './InfrastructureAnalytics';
import IrrigationAnalytics from './IrrigationAnalytics';
import SocialAnalytics from './SocialAnalytics';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function Pills({ items, current, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            current === item
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {item.charAt(0).toUpperCase() + item.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function Browse({ onBack }) {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSector, setActiveSector] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/districts`)
      .then(r => r.json())
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    fetch(`${API_BASE}/api/districts/${selectedDistrict.key}/villages`)
      .then(r => r.json())
      .then(setVillages)
      .catch(() => setVillages([]))
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  useEffect(() => {
    if (!selectedDistrict || !selectedVillage) return;
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/districts/${selectedDistrict.key}/villages/${selectedVillage.key}`)
      .then(r => r.json())
      .then(data => {
        setInsights(data);
        const sectors = Object.keys(data.sectors || {});
        if (sectors.length > 0 && !activeSector) {
          setActiveSector(sectors[0]);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selectedDistrict, selectedVillage]);

  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
    setSelectedVillage(null);
    setInsights(null);
    setActiveSector('');
    setSearchQuery('');
  };

  const handleVillageClick = (village) => {
    setSelectedVillage(village);
  };

  const handleBackToDistricts = () => {
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setInsights(null);
    setActiveSector('');
    setVillages([]);
    setSearchQuery('');
  };

  const handleBackToVillages = () => {
    setSelectedVillage(null);
    setInsights(null);
    setActiveSector('');
    setSearchQuery('');
  };

  const sectors = insights ? Object.keys(insights.sectors || {}) : [];

  const filteredDistricts = districts.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVillages = villages.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <BuildingLibraryIcon className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Browse Districts & Villages</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          {!selectedDistrict && 'Explore all districts in Haryana'}
          {selectedDistrict && !selectedVillage && `Browsing villages in ${selectedDistrict.name.replace(/\s*\(\d+\)\s*$/, '')}`}
          {selectedDistrict && selectedVillage && `Viewing data for ${selectedVillage.name.replace(/\s*\(\d+\)\s*$/, '')}, ${selectedDistrict.name.replace(/\s*\(\d+\)\s*$/, '')}`}
        </p>
      </div>

      {/* District List View */}
      {!selectedDistrict && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Districts</h2>
            <input
              type="text"
              placeholder="Search districts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDistricts.map((district) => (
              <button
                key={district.key}
                onClick={() => handleDistrictClick(district)}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-xl border border-indigo-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <MapPinIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900">{district.name.replace(/\s*\(\d+\)\s*$/, '')}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-indigo-600 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
          
          {filteredDistricts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No districts found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Village List View */}
      {selectedDistrict && !selectedVillage && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <button
            onClick={handleBackToDistricts}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Districts</span>
          </button>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Villages in {selectedDistrict.name.replace(/\s*\(\d+\)\s*$/, '')}
            </h2>
            <input
              type="text"
              placeholder="Search villages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading villages...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVillages.map((village) => (
                  <button
                    key={village.key}
                    onClick={() => handleVillageClick(village)}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all group"
                  >
                    <span className="text-sm font-medium text-gray-900">{village.name.replace(/\s*\(\d+\)\s*$/, '')}</span>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              
              {filteredVillages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? `No villages found matching "${searchQuery}"` : 'No villages available'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Village Details View */}
      {selectedDistrict && selectedVillage && insights && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={handleBackToVillages}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Villages</span>
              </button>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPinIcon className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">{selectedDistrict.name.replace(/\s*\(\d+\)\s*$/, '')}</span>
                </div>
                <div className="pl-6 text-gray-600">{selectedVillage.name.replace(/\s*\(\d+\)\s*$/, '')}</div>
              </div>
            </div>

            {sectors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Sectors</h3>
                <Pills items={sectors} current={activeSector} onChange={setActiveSector} />
              </div>
            )}
          </aside>

          {/* Main content */}
          <section className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Error loading data</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {loading && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border p-8 animate-pulse">
                  <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
                  <div className="h-4 w-full bg-gray-100 rounded mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                  <div className="h-64 bg-gray-100 rounded-xl" />
                </div>
              </div>
            )}

            {!loading && sectors.length > 0 && activeSector === 'agriculture' && (
              <AgricultureAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length > 0 && activeSector === 'education' && (
              <EducationAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length > 0 && activeSector === 'health' && (
              <HealthAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length > 0 && activeSector === 'infra' && (
              <InfrastructureAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length > 0 && activeSector === 'irrigation' && (
              <IrrigationAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length > 0 && activeSector === 'social' && (
              <SocialAnalytics district={selectedDistrict.key} village={selectedVillage.key} />
            )}

            {!loading && sectors.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <div className="text-yellow-800 font-medium">No data available</div>
                <div className="text-yellow-600 text-sm mt-1">No data available for this village.</div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
