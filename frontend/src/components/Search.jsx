import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, MapPinIcon, ChartBarIcon, ClockIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AgricultureAnalytics from './AgricultureAnalytics';
import EducationAnalytics from './EducationAnalytics';
import HealthAnalytics from './HealthAnalytics';
import InfrastructureAnalytics from './InfrastructureAnalytics';
import IrrigationAnalytics from './IrrigationAnalytics';
import SocialAnalytics from './SocialAnalytics';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function SearchableSelect({ label, value, onChange, options, placeholder, disabled, icon: Icon }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [query, options]);

  const selectedOption = options.find(o => o.key === value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <div className="flex items-center gap-2 w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-xl hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
          {Icon && <Icon className="h-5 w-5 text-gray-400" />}
          <input
            type="text"
            value={isOpen ? query : (selectedOption?.name.replace(/\s*\(\d+\)\s*$/, '') || '')}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 outline-none bg-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50"
          />
        </div>
        {isOpen && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            {filtered.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  onChange(opt.key);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-900 text-sm transition-colors"
              >
                {opt.name.replace(/\s*\(\d+\)\s*$/, '')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

export default function Search({ onBack }) {
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState('');
  const [villages, setVillages] = useState([]);
  const [village, setVillage] = useState('');
  const [insights, setInsights] = useState(null);
  const [ai, setAi] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSector, setActiveSector] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/districts`).then(r => r.json()).then(setDistricts).catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    setVillage('');
    setVillages([]);
    setInsights(null);
    setSchema(null);
    if (!district) return;
    fetch(`${API_BASE}/api/districts/${district}/villages`).then(r => r.json()).then(setVillages).catch(() => setVillages([]));
  }, [district]);

  useEffect(() => {
    setInsights(null);
    setSchema(null);
    setAi(null);
    setError('');
    if (!district || !village) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/districts/${district}/villages/${village}`).then(r => r.json()),
      fetch(`${API_BASE}/api/districts/${district}/villages/${village}/schema`).then(r => r.json()),
      fetch(`${API_BASE}/api/districts/${district}/villages/${village}/insights`).then(r => r.json())
    ]).then(([ins, sch, aiRes]) => {
      setInsights(ins);
      setSchema(sch);
      setAi(aiRes);
    }).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, [district, village]);

  const sectors = useMemo(() => insights ? Object.keys(insights.sectors || {}) : [], [insights]);

  useEffect(() => {
    if (sectors.length && !activeSector) setActiveSector(sectors[0]);
    if (!sectors.length) setActiveSector('');
  }, [sectors, activeSector]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <MagnifyingGlassIcon className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Search Villages</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          Select a district and village to explore detailed analytics across all development sectors.
        </p>
      </div>

      {!insights ? (
        /* Selection Section */
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Exploration</h3>
              <p className="text-gray-600">Select a district and village to view detailed analytics</p>
            </div>
            
            <div className="space-y-6">
              <SearchableSelect 
                label="District" 
                value={district} 
                onChange={setDistrict} 
                options={districts} 
                placeholder="Choose a district" 
                icon={MapPinIcon}
              />
              
              <SearchableSelect 
                label="Village" 
                value={village} 
                onChange={setVillage} 
                options={villages} 
                placeholder="Choose a village" 
                disabled={!district}
                icon={MapPinIcon}
              />
            </div>
            
            {loading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-indigo-600">
                <ClockIcon className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading village data...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <div className="space-y-4">
                <SearchableSelect 
                  label="District" 
                  value={district} 
                  onChange={setDistrict} 
                  options={districts} 
                  placeholder="Choose a district" 
                  icon={MapPinIcon}
                />
                
                <SearchableSelect 
                  label="Village" 
                  value={village} 
                  onChange={setVillage} 
                  options={villages} 
                  placeholder="Choose a village" 
                  disabled={!district}
                  icon={MapPinIcon}
                />
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

            {!loading && insights && sectors.length > 0 && activeSector === 'agriculture' && (
              <AgricultureAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length > 0 && activeSector === 'education' && (
              <EducationAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length > 0 && activeSector === 'health' && (
              <HealthAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length > 0 && activeSector === 'infra' && (
              <InfrastructureAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length > 0 && activeSector === 'irrigation' && (
              <IrrigationAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length > 0 && activeSector === 'social' && (
              <SocialAnalytics district={district} village={village} />
            )}

            {!loading && insights && sectors.length === 0 && (
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
