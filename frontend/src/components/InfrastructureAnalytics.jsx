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
  Filler
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { 
  BuildingOfficeIcon, 
  WifiIcon, 
  TruckIcon, 
  MapPinIcon,
  WrenchScrewdriverIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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

const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-sm opacity-60">{subtitle}</p>}
        </div>
        {Icon && <Icon className="h-8 w-8 opacity-75" />}
      </div>
    </div>
  );
};

const ChartCard = ({ title, children, className = "" }) => (
  <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
    <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
    {children}
  </div>
);

const InfrastructureIndicator = ({ category, items, color = "blue" }) => {
  const availableCount = Object.values(items).filter(Boolean).length;
  const totalCount = Object.keys(items).length;
  const percentage = Math.round((availableCount / totalCount) * 100);
  
  const getColorClass = (color) => {
    const colors = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      orange: "bg-orange-500",
      purple: "bg-purple-500",
      red: "bg-red-500"
    };
    return colors[color] || "bg-blue-500";
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-gray-800">{category}</h4>
        <span className="text-sm font-semibold text-gray-600">
          {availableCount}/{totalCount}
        </span>
      </div>
      
      <div className="space-y-2">
        {Object.entries(items).map(([key, available], index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className={`w-4 h-4 rounded-full ${available ? getColorClass(color) : 'bg-gray-300'}`}>
              {available && (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getColorClass(color)}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentage}% available</p>
      </div>
    </div>
  );
};

const AccessibilityIndicator = ({ accessibility }) => {
  const accessibilityItems = [
    { label: 'Post Office', distance: accessibility.postOfficeDistance, icon: '📮' },
    { label: 'Telephone', distance: accessibility.telephoneDistance, icon: '📞' },
    { label: 'Internet/CSC', distance: accessibility.internetDistance, icon: '💻' },
    { label: 'Public Bus', distance: accessibility.publicBusDistance, icon: '🚌' },
    { label: 'Railway', distance: accessibility.railwayDistance, icon: '🚂' },
    { label: 'Highway', distance: accessibility.highwayDistance, icon: '🛣️' }
  ];

  const getDistanceColor = (distance) => {
    if (distance === 0) return 'bg-green-500';
    if (distance <= 5) return 'bg-yellow-500';
    if (distance <= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDistanceText = (distance) => {
    if (distance === 0) return 'In Village';
    if (distance <= 5) return `${distance}km - Near`;
    if (distance <= 10) return `${distance}km - Moderate`;
    return `${distance}km - Far`;
  };

  return (
    <div className="space-y-3">
      {accessibilityItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium text-gray-700">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-white text-sm ${getDistanceColor(item.distance)}`}>
              {getDistanceText(item.distance)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const InfrastructureAnalytics = ({ district, village }) => {
  const [infraData, setInfraData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!district || !village) return;
    
    setLoading(true);
    setError('');
    
    fetch(`${API_BASE}/api/districts/${district}/villages/${village}/infrastructure-analytics`)
      .then(r => r.json())
      .then(setInfraData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [district, village]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Infrastructure Data</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!infraData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No infrastructure data available</p>
      </div>
    );
  }

  // Prepare chart data
  const infrastructureScores = {
    labels: ['Water & Sanitation', 'Communication', 'Transportation'],
    datasets: [
      {
        label: 'Available Infrastructure',
        data: [
          infraData.scores.waterSanitationScore,
          infraData.scores.communicationScore,
          infraData.scores.transportationScore
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Green
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(249, 115, 22, 0.8)'   // Orange
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(249, 115, 22, 1)'
        ],
        borderWidth: 1,
      }
    ],
  };

  const qualityDistribution = {
    labels: ['Infrastructure Index', 'Accessibility Score'],
    datasets: [
      {
        data: [infraData.scores.infrastructureIndex, infraData.scores.accessibilityScore],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',  // Purple
          'rgba(34, 197, 94, 0.8)'    // Green
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(34, 197, 94, 1)'
        ],
        borderWidth: 1,
      }
    ],
  };

  const infrastructureRadar = {
    labels: ['Water & Sanitation', 'Communication', 'Transportation', 'Accessibility', 'Overall Quality'],
    datasets: [
      {
        label: 'Infrastructure Profile',
        data: [
          (infraData.scores.waterSanitationScore / Object.keys(infraData.waterSanitation).length) * 100,
          (infraData.scores.communicationScore / Object.keys(infraData.communication).length) * 100,
          (infraData.scores.transportationScore / Object.keys(infraData.transportation).length) * 100,
          infraData.scores.accessibilityScore,
          infraData.scores.infrastructureIndex
        ],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      r: {
        angleLines: {
          display: false
        },
        suggestedMin: 0,
        suggestedMax: 100
      }
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'Excellent': return 'green';
      case 'Good': return 'blue';
      case 'Fair': return 'yellow';
      case 'Poor': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BuildingOfficeIcon className="h-8 w-8" />
          Infrastructure Analytics Dashboard
        </h1>
        <p className="mt-2 opacity-90">
          {infraData.village}, {infraData.district} - Infrastructure Development Analysis
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Infrastructure Index"
          value={`${infraData.scores.infrastructureIndex}%`}
          subtitle={infraData.scores.quality}
          icon={WrenchScrewdriverIcon}
          color={getQualityColor(infraData.scores.quality)}
        />
        <StatCard
          title="Accessibility Score"
          value={`${infraData.scores.accessibilityScore}%`}
          subtitle="Service proximity"
          icon={MapPinIcon}
          color="blue"
        />
        <StatCard
          title="Population"
          value={infraData.demographics.totalPopulation.toLocaleString()}
          subtitle={`${infraData.demographics.totalHouseholds} households`}
          icon={BuildingOfficeIcon}
          color="purple"
        />
        <StatCard
          title="Population Density"
          value={`${infraData.demographics.populationDensity}`}
          subtitle="per hectare"
          icon={SignalIcon}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Infrastructure Availability by Category">
          <Bar data={infrastructureScores} options={chartOptions} />
        </ChartCard>
        
        <ChartCard title="Overall Infrastructure Quality">
          <Doughnut data={qualityDistribution} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Infrastructure Profile">
          <Radar data={infrastructureRadar} options={radarOptions} />
        </ChartCard>
        
        <ChartCard title="Service Accessibility">
          <AccessibilityIndicator accessibility={infraData.accessibility} />
        </ChartCard>
      </div>

      {/* Infrastructure Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InfrastructureIndicator 
          category="Water & Sanitation"
          items={infraData.waterSanitation}
          color="green"
        />
        <InfrastructureIndicator 
          category="Communication"
          items={infraData.communication}
          color="blue"
        />
        <InfrastructureIndicator 
          category="Transportation"
          items={infraData.transportation}
          color="orange"
        />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Key Strengths" className="border-green-200">
          <div className="space-y-3">
            {infraData.insights.strengths.length > 0 ? (
              infraData.insights.strengths.map((strength, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-800 text-sm">{strength}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No significant strengths identified in current data.</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Areas for Improvement" className="border-orange-200">
          <div className="space-y-3">
            {infraData.insights.improvements.length > 0 ? (
              infraData.insights.improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-orange-800 text-sm">{improvement}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No major improvement areas identified in current data.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default InfrastructureAnalytics;