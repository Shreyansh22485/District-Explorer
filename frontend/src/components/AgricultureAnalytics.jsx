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
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { SunIcon } from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

export default function AgricultureAnalytics({ district, village }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!district || !village) return;
    
    setLoading(true);
    setError('');
    
    fetch(`${API_BASE}/api/districts/${district}/villages/${village}/agriculture-analytics`)
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
        <p className="text-red-700">Error loading agriculture data: {error}</p>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700">{data?.message || 'No agriculture data available'}</p>
      </div>
    );
  }

  // Prepare chart data
  const landUsageData = {
    labels: ['Agricultural', 'Forest', 'Non-Agricultural', 'Barren', 'Grazing', 'Tree Crops', 'Waste/Fallow'],
    datasets: [{
      label: 'Land Usage (Hectares)',
      data: [
        data.landUsage.agriculturalArea,
        data.landUsage.forestArea,
        data.landUsage.nonAgriculturalArea,
        data.landUsage.barrenLand,
        data.landUsage.grazingLand,
        data.landUsage.treeCropsArea,
        data.landUsage.culturableWasteLand + data.landUsage.fallowsLand + data.landUsage.currentFallows
      ],
      backgroundColor: [
        '#10B981', // Green - Agricultural
        '#059669', // Dark Green - Forest
        '#6B7280', // Gray - Non-Agricultural
        '#DC2626', // Red - Barren
        '#F59E0B', // Amber - Grazing
        '#8B5CF6', // Purple - Tree Crops
        '#EF4444'  // Red - Waste/Fallow
      ],
      borderWidth: 1
    }]
  };

  const demographicsData = {
    labels: ['Male', 'Female'],
    datasets: [{
      data: [data.demographics.malePopulation, data.demographics.femalePopulation],
      backgroundColor: ['#3B82F6', '#EC4899'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const cropData = {
    labels: ['Wheat', 'Rice', 'Mustard', 'Others'],
    datasets: [{
      label: 'Crop Availability',
      data: Object.values(data.crops).map(available => available ? 1 : 0),
      backgroundColor: [
        data.crops.wheat ? '#F59E0B' : '#E5E7EB',
        data.crops.rice ? '#10B981' : '#E5E7EB', 
        data.crops.mustard ? '#8B5CF6' : '#E5E7EB',
        data.crops.others ? '#3B82F6' : '#E5E7EB'
      ],
      borderWidth: 1
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SunIcon className="h-8 w-8" />
          Agriculture Analytics Dashboard
        </h1>
        <p className="mt-2 opacity-90">
          {data.village}, {data.district} - Agricultural Development Analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Area" 
          value={`${data.landUsage.totalArea} ha`}
          subtitle="Geographic area"
          color="indigo"
        />
        <StatCard 
          title="Population Density" 
          value={`${Math.round(data.metrics.populationDensity)}/ha`}
          subtitle="People per hectare"
          color="blue"
        />
        <StatCard 
          title="Agricultural Ratio" 
          value={`${Math.round(data.metrics.agriculturalRatio)}%`}
          subtitle="Land used for farming"
          color="green"
        />
        <StatCard 
          title="Crop Diversity" 
          value={`${data.metrics.cropDiversity}/4`}
          subtitle="Types of crops grown"
          color="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Land Usage Chart */}
        <ChartCard 
          title="Land Usage Distribution" 
          description="How the village land is utilized (in hectares)"
        >
          <Bar data={landUsageData} options={chartOptions} />
        </ChartCard>

        {/* Demographics Chart */}
        <ChartCard 
          title="Population Demographics" 
          description={`Total: ${data.demographics.totalPopulation.toLocaleString()} people in ${data.demographics.households} households`}
        >
          <Doughnut data={demographicsData} options={chartOptions} />
        </ChartCard>

        {/* Crop Availability */}
        <ChartCard 
          title="Crop Availability" 
          description="Which crops are grown in this village"
        >
          <Bar data={cropData} options={chartOptions} />
        </ChartCard>

        {/* Efficiency Metrics */}
        <ChartCard 
          title="Land Efficiency Metrics"
          description="Key agricultural efficiency indicators"
        >
          <div className="space-y-4 pt-8">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Agricultural Land Ratio</span>
              <span className="text-lg font-bold text-green-600">{Math.round(data.metrics.agriculturalRatio)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Waste Land Ratio</span>
              <span className="text-lg font-bold text-red-600">{Math.round(data.metrics.wasteRatio)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Village Cluster</span>
              <span className="text-lg font-bold text-blue-600">#{data.metrics.clusters}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">People per Household</span>
              <span className="text-lg font-bold text-purple-600">{Math.round(data.demographics.totalPopulation / data.demographics.households)}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Strengths</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {data.metrics.agriculturalRatio > 50 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  High agricultural land utilization ({Math.round(data.metrics.agriculturalRatio)}%)
                </li>
              )}
              {data.metrics.cropDiversity >= 3 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Good crop diversity ({data.metrics.cropDiversity} types)
                </li>
              )}
              {data.landUsage.forestArea > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Forest cover available ({data.landUsage.forestArea} ha)
                </li>
              )}
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Areas for Improvement</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {data.metrics.wasteRatio > 20 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  High waste land ratio ({Math.round(data.metrics.wasteRatio)}%)
                </li>
              )}
              {data.metrics.cropDiversity <= 2 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Limited crop diversity ({data.metrics.cropDiversity} types)
                </li>
              )}
              {data.metrics.populationDensity > 50 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  High population density ({Math.round(data.metrics.populationDensity)}/ha)
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}