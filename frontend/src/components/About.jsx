import React from 'react'
import { ArrowLeftIcon, AcademicCapIcon, UserIcon } from '@heroicons/react/24/solid'

export default function About({ onBack }) {
  const teamMembers = [
    {
      name: 'Shreyansh Srivastav',
      email: 'shreyansh22485@iiitd.ac.in',
      image: '/src/assets/Shreyansh.jpg'
      // To use your own image, replace with: image: '/src/assets/shreyansh.jpg'
    },
    {
      name: 'Riya Gupta',
      email: 'riya22410@iiitd.ac.in',
      image: '/src/assets/Riya.jpg'
      // To use your own image, replace with: image: '/src/assets/riya.jpg'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
        <button onClick={onBack} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </button>
        <h1 className="text-4xl font-bold mb-3">About This Project</h1>
        <p className="text-indigo-100 text-lg max-w-3xl">
          A comprehensive village-level analytics platform for development planning and policy research across Haryana.
        </p>
      </div>

      {/* Project Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <AcademicCapIcon className="h-6 w-6 text-indigo-600" />
          </div>
          Project Overview
        </h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-4">
            This platform aggregates and analyzes multi-sector development indicators across 6,800+ villages in Haryana. 
            We provide:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold mt-1">•</span>
              <span><strong>Descriptive analytics:</strong> Summary statistics and trends across agriculture, education, health, infrastructure, irrigation, and social sectors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold mt-1">•</span>
              <span><strong>Clustering & segmentation:</strong> Village classification based on development indicators to identify patterns and gaps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold mt-1">•</span>
              <span><strong>Interactive visualizations:</strong> Charts, maps, and comparative metrics for data-driven decision making</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-purple-600" />
          </div>
          Our Team
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center gap-4">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                  <a href={`mailto:${member.email}`} className="text-sm text-indigo-600 hover:text-indigo-700 mt-1 block">
                    {member.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Faculty Advisor */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-200">
          <div className="flex flex-col items-center text-center gap-4">
            <img 
              src="/src/assets/raghava.jpg"
              alt="Professor GPS Raghava"
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Professor GPS Raghava</h3>
              <p className="text-sm text-indigo-600 font-medium mt-1">Faculty Advisor</p>
              <a href="mailto:raghava@iiitd.ac.in" className="text-sm text-indigo-600 hover:text-indigo-700 mt-1 block">
                raghava@iiitd.ac.in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
