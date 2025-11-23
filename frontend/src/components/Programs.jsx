import React from 'react'
import { ArrowLeftIcon, GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/solid'

export default function Programs({ onBack }) {
  const india = [
  { 
    name: 'Shining India Campaign (2000s)', 
    url: 'https://archive.india.gov.in', 
    description: 'Government narrative promoting India’s economic growth and global image in the early 2000s' 
  },
  { 
    name: 'NITI Aayog – National Data and Analytics Platform (NDAP)', 
    url: 'https://ndap.niti.gov.in/', 
    description: 'Open data platform providing standardized datasets for policy analysis and decision-making' 
  },
  { 
    name: 'Mission Antyodaya Survey', 
    url: 'https://missionantyodaya.nic.in/', 
    description: 'Annual survey assessing village-level infrastructure and development indicators' 
  },
  { 
    name: 'Smart Cities Mission', 
    url: 'https://smartcities.gov.in/', 
    description: 'Urban renewal program for developing sustainable and citizen-friendly smart cities' 
  },
  { 
    name: 'Swachh Bharat Mission – Gramin (SBM-G)', 
    url: 'https://swachhbharatmission.gov.in/sbmg/', 
    description: 'Rural sanitation program focusing on toilet construction and behavioural change' 
  },
  { 
    name: 'PMGSY (Pradhan Mantri Gram Sadak Yojana)', 
    url: 'https://pmgsy.nic.in/', 
    description: 'Rural road development initiative for all-weather connectivity' 
  }
];

const world = [
  { 
    name: 'Sustainable Infrastructure Programme in Asia (SIPA – OECD)', 
    url: 'https://www.oecd.org/', 
    description: 'OECD initiative supporting sustainable and resilient infrastructure development in Asia' 
  },
  { 
    name: 'SURGE – Sustainable Urban and Regional Development Program (World Bank)', 
    url: 'https://www.worldbank.org/', 
    description: 'World Bank program strengthening urban systems and regional development' 
  },
  { 
    name: 'Global Gateway Initiative (European Union)', 
    url: 'https://commission.europa.eu/strategy-and-policy/global-gateway_en', 
    description: 'EU initiative for sustainable and trusted global infrastructure investment' 
  },
  { 
    name: 'Quality Infrastructure Investment (QII) Partnership', 
    url: 'https://www.worldbank.org/en/topic/infrastructure', 
    description: 'World Bank–Japan partnership promoting quality, sustainable and resilient infrastructure' 
  },
  { 
    name: 'Data2Policy (GIZ & ODI)', 
    url: 'https://www.giz.de/', 
    description: 'Program supporting evidence-based policymaking through improved data systems' 
  }
];

  const ProgramCard = ({ program, icon: Icon, color }) => (
    <a 
      href={program.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
            {program.name}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {program.description}
          </p>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
        <button onClick={onBack} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </button>
        <h1 className="text-4xl font-bold mb-3">Similar Programs</h1>
        <p className="text-green-100 text-lg max-w-3xl">
          Explore rural development initiatives in India and around the world that share our mission of data-driven planning and sustainable growth.
        </p>
      </div>

      {/* India Programs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <MapPinIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">India</h2>
            <p className="text-sm text-gray-600">National rural development programs</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {india.map((program, idx) => (
            <ProgramCard key={idx} program={program} icon={MapPinIcon} color="bg-gradient-to-br from-orange-500 to-orange-600" />
          ))}
        </div>
      </div>

      {/* World Programs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <GlobeAltIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Global</h2>
            <p className="text-sm text-gray-600">International development initiatives</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {world.map((program, idx) => (
            <ProgramCard key={idx} program={program} icon={GlobeAltIcon} color="bg-gradient-to-br from-blue-500 to-blue-600" />
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong className="text-indigo-900">Note:</strong> These programs represent complementary initiatives in rural development. 
          Our platform focuses on village-level analytics to support evidence-based planning across similar development sectors.
        </p>
      </div>
    </div>
  )
}
