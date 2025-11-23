import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);
import { AcademicCapIcon } from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function StatCard({ title, value, subtitle, color = 'indigo', icon }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className={`p-2 bg-${color}-50 rounded-lg`}>{icon}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, description }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      <div className="h-80">
        {children}
      </div>
    </div>
  );
}

function AccessibilityIndicator({ label, distance, available }) {
  const getAccessibilityColor = (dist) => {
    if (dist === 0) return 'bg-green-500'; // Available in village
    if (dist <= 5) return 'bg-yellow-500'; // Close by
    if (dist <= 10) return 'bg-orange-500'; // Moderate distance
    return 'bg-red-500'; // Far away
  };

  const getAccessibilityText = (dist) => {
    if (dist === 0) return 'In Village';
    if (dist <= 5) return `${dist} km (Close)`;
    if (dist <= 10) return `${dist} km (Moderate)`;
    return `${dist} km (Far)`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getAccessibilityColor(distance)}`}></div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {available > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{available} available</span>}
      </div>
      <span className="text-sm text-gray-600">{getAccessibilityText(distance)}</span>
    </div>
  );
}

export default function EducationAnalytics({ district, village }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!district || !village) return;
    
    setLoading(true);
    setError('');
    
    fetch(`${API_BASE}/api/districts/${district}/villages/${village}/education-analytics`)
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [district, village]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading education data: {error}</p>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700">{data?.message || 'No education data available'}</p>
      </div>
    );
  }

  // Prepare chart data
  const schoolTypesData = {
    labels: ['Pre-Primary', 'Middle', 'Secondary', 'Sr. Secondary', 'Arts & Science', 'Engineering', 'Medicine', 'Management', 'Vocational', 'Special Ed'],
    datasets: [{
      label: 'Number of Schools/Institutes',
      data: [
        data.schools.prePrimary,
        data.schools.middle,
        data.schools.secondary,
        data.schools.seniorSecondary,
        data.schools.artsScience,
        data.schools.engineering,
        data.schools.medicine,
        data.schools.management,
        data.schools.vocational,
        data.schools.disabled
      ],
      backgroundColor: [
        '#10B981', // Green - Pre-Primary
        '#059669', // Dark Green - Middle
        '#3B82F6', // Blue - Secondary
        '#1D4ED8', // Dark Blue - Sr. Secondary
        '#8B5CF6', // Purple - Arts & Science
        '#7C3AED', // Dark Purple - Engineering
        '#EC4899', // Pink - Medicine
        '#BE185D', // Dark Pink - Management
        '#F59E0B', // Amber - Vocational
        '#DC2626'  // Red - Special Ed
      ],
      borderWidth: 1
    }]
  };

  const educationLevelsData = {
    labels: ['Basic Education', 'Higher Education', 'Specialized Training'],
    datasets: [{
      data: [data.metrics.basicEducationSchools, data.metrics.higherEducationInstitutes, data.metrics.specializedTraining],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const accessibilityData = {
    labels: ['Pre-Primary', 'Middle', 'Secondary', 'Sr. Secondary', 'Vocational', 'Higher Ed'],
    datasets: [{
      label: 'Distance to Nearest Facility (km)',
      data: [
        data.accessibility.prePrimary,
        data.accessibility.middle,
        data.accessibility.secondary,
        data.accessibility.seniorSecondary,
        data.accessibility.vocational,
        Math.max(data.accessibility.artsScience, data.accessibility.engineering, data.accessibility.medicine, data.accessibility.management)
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(59, 130, 246)',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 15,
        ticks: {
          stepSize: 5
        }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <AcademicCapIcon className="h-8 w-8" />
          Education Analytics Dashboard
        </h1>
        <p className="mt-2 opacity-90">
          {data.village}, {data.district} - Educational Infrastructure Analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Schools" 
          value={data.metrics.totalSchools}
          subtitle="Educational institutions"
          color="indigo"
        />
        <StatCard 
          title="Schools per 1000" 
          value={Math.round(data.metrics.schoolsPerThousand)}
          subtitle="Population ratio"
          color="blue"
        />
        <StatCard 
          title="Coverage" 
          value={`${Math.round(data.metrics.educationCoverageRatio)}%`}
          subtitle="Facilities in village"
          color="green"
        />
        <StatCard 
          title="Avg Distance" 
          value={`${data.metrics.avgDistanceToFacilities || 0} km`}
          subtitle="To external facilities"
          color="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Types Distribution */}
        <ChartCard 
          title="Schools by Type" 
          description="Number of educational institutions available"
        >
          <Bar data={schoolTypesData} options={chartOptions} />
        </ChartCard>

        {/* Education Levels */}
        <ChartCard 
          title="Education Level Distribution" 
          description="Basic vs Higher Education vs Specialized Training"
        >
          <Doughnut data={educationLevelsData} options={chartOptions} />
        </ChartCard>

        {/* Accessibility Radar */}
        <ChartCard 
          title="Education Accessibility" 
          description="Distance to educational facilities (0 = available in village)"
        >
          <Radar data={accessibilityData} options={radarOptions} />
        </ChartCard>

        {/* Education Infrastructure Summary */}
        <ChartCard 
          title="Infrastructure Summary"
          description="Key education infrastructure metrics"
        >
          <div className="space-y-4 pt-8">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Basic Education (Pre-Sr.Sec)</span>
              <span className="text-lg font-bold text-green-600">{data.metrics.basicEducationSchools}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Higher Education</span>
              <span className="text-lg font-bold text-blue-600">{data.metrics.higherEducationInstitutes}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Specialized Training</span>
              <span className="text-lg font-bold text-purple-600">{data.metrics.specializedTraining}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Village Cluster</span>
              <span className="text-lg font-bold text-orange-600">#{data.metrics.clusters}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Education Accessibility Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Education Accessibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Basic Education</h4>
            <AccessibilityIndicator label="Pre-Primary" distance={data.accessibility.prePrimary} available={data.schools.prePrimary} />
            <AccessibilityIndicator label="Middle School" distance={data.accessibility.middle} available={data.schools.middle} />
            <AccessibilityIndicator label="Secondary" distance={data.accessibility.secondary} available={data.schools.secondary} />
            <AccessibilityIndicator label="Senior Secondary" distance={data.accessibility.seniorSecondary} available={data.schools.seniorSecondary} />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Higher & Specialized Education</h4>
            <AccessibilityIndicator label="Arts & Science College" distance={data.accessibility.artsScience} available={data.schools.artsScience} />
            <AccessibilityIndicator label="Engineering College" distance={data.accessibility.engineering} available={data.schools.engineering} />
            <AccessibilityIndicator label="Vocational Training" distance={data.accessibility.vocational} available={data.schools.vocational} />
            <AccessibilityIndicator label="Special Education" distance={data.accessibility.disabled} available={data.schools.disabled} />
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Education Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Strengths</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {data.metrics.basicEducationSchools > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Basic education infrastructure present ({data.metrics.basicEducationSchools} schools)
                </li>
              )}
              {data.metrics.educationCoverageRatio >= 50 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Good local coverage ({Math.round(data.metrics.educationCoverageRatio)}% facilities in village)
                </li>
              )}
              {data.metrics.higherEducationInstitutes > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Higher education available ({data.metrics.higherEducationInstitutes} institutes)
                </li>
              )}
              {data.schools.vocational > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Vocational training opportunities available
                </li>
              )}
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Areas for Improvement</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {data.metrics.basicEducationSchools === 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  No basic education infrastructure in village
                </li>
              )}
              {data.metrics.avgDistanceToFacilities > 10 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  High average distance to facilities ({data.metrics.avgDistanceToFacilities} km)
                </li>
              )}
              {data.metrics.higherEducationInstitutes === 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  No higher education institutions
                </li>
              )}
              {data.schools.vocational === 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Limited vocational training opportunities
                </li>
              )}
              {data.schools.disabled === 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  No special education facilities
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}