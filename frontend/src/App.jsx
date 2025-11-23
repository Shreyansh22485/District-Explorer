import React, { useState } from 'react';
import {
  MapPinIcon,
  ChartBarIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Programs from './components/Programs';
import Sectors from './components/Sectors';
import About from './components/About';
import Search from './components/Search';
import Browse from './components/Browse';
import Contact from './components/Contact';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Enhanced Header with Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">District Explorer</h1>
                <p className="text-sm text-gray-600">Village-level development insights</p>
              </div>
            </div>

            <nav className="flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'home' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Home
              </button>
              <button
                onClick={() => setView('search')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'search' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Search
              </button>
              <button
                onClick={() => setView('browse')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'browse' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Browse
              </button>
              <button
                onClick={() => setView('sectors')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'sectors' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Sectors
              </button>
              <button
                onClick={() => setView('programs')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'programs' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Similar Programs
              </button>
              <button
                onClick={() => setView('about')}
                className={`text-sm px-3 py-2 rounded-md ${view === 'about' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                About
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show on home view */}
      {view === 'home' && (
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
            <div className="text-center">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Explore Rural Development
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Across Haryana Villages
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Comprehensive analytics across agriculture, education, health, infrastructure, irrigation, and social sectors
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <ChartBarIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Rich Analytics</h3>
                  <p className="text-sm text-gray-600">Interactive charts and insights for informed decision making</p>
                </div>
                
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <MapPinIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Village-Level Data</h3>
                  <p className="text-sm text-gray-600">Granular insights at the most local administrative level</p>
                </div>
                
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Multi-Sector View</h3>
                  <p className="text-sm text-gray-600">Comprehensive coverage across all development sectors</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'search' ? (
          <Search onBack={() => setView('home')} />
        ) : view === 'browse' ? (
          <Browse onBack={() => setView('home')} />
        ) : view === 'sectors' ? (
          <Sectors onBack={() => setView('home')} />
        ) : view === 'about' ? (
          <About onBack={() => setView('home')} />
        ) : view === 'programs' ? (
          <Programs onBack={() => setView('home')} />
        ) : view === 'contact' ? (
          <Contact onBack={() => setView('home')} />
        ) : (
          <>
            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <button
                onClick={() => setView('search')}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-indigo-300 transition-all text-left"
              >
                <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MagnifyingGlassIcon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  Search Villages
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Quick search by district and village to access detailed development analytics
                </p>
                <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
                  <span>Get Started</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => setView('browse')}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-green-300 transition-all text-left"
              >
                <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpenIcon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Browse Districts
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Explore all districts and navigate through villages with intuitive listings
                </p>
                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  <span>Explore Now</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => setView('sectors')}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-orange-300 transition-all text-left"
              >
                <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                  Sector Overview
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  View state-wide statistics across all 6 development sectors
                </p>
                <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
                  <span>View Stats</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Features Section */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-10 mb-12">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
                  <SparklesIcon className="h-4 w-4" />
                  <span>Platform Features</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Comprehensive Data Analytics Platform
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Built to support evidence-based planning and decision making for rural development
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">6 Key Sectors</h3>
                  <p className="text-sm text-gray-600">
                    Agriculture, Education, Health, Infrastructure, Irrigation, and Social development
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <MapPinIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Village-Level Insights</h3>
                  <p className="text-sm text-gray-600">
                    Granular data at the most local administrative level for precise analysis
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Interactive Charts</h3>
                  <p className="text-sm text-gray-600">
                    Visual data representations for easy understanding and comparison
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real-Time Analytics</h3>
                  <p className="text-sm text-gray-600">
                    Dynamic data processing for instant insights and trend analysis
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Advanced Search</h3>
                  <p className="text-sm text-gray-600">
                    Quick filtering and search capabilities across districts and villages
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <UserGroupIcon className="h-5 w-5 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Comparative Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Compare metrics across villages and sectors for informed planning
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-10 text-center text-white">
              <div className="max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 mb-4">
                  <RocketLaunchIcon className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
                <p className="text-indigo-100 mb-8 text-lg">
                  Start analyzing village-level development data across Haryana to support evidence-based planning
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => setView('search')}
                    className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all"
                  >
                    Search Villages
                  </button>
                  <button
                    onClick={() => setView('browse')}
                    className="px-8 py-3 bg-indigo-700 text-white font-semibold rounded-xl hover:bg-indigo-800 transform hover:scale-105 transition-all"
                  >
                    Browse Districts
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* About Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">District Explorer</h3>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                A comprehensive platform for village-level development analytics across Haryana. 
                Supporting evidence-based planning through data-driven insights across agriculture, 
                education, health, infrastructure, irrigation, and social sectors.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setView('home')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('search')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Search
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('browse')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Browse
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('sectors')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Sectors
                  </button>
                </li>
              </ul>
            </div>

            {/* More Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">More</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setView('about')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('programs')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Similar Programs
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('contact')} className="text-gray-400 hover:text-indigo-400 transition-colors">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2025 Haryana District Explorer.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Developed by Shreyansh Srivastav & Riya Gupta</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
