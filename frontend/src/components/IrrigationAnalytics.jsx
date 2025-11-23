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
  BeakerIcon, 
  MapIcon, 
  ChartBarIcon, 
  CircleStackIcon,
  SunIcon,
  CpuChipIcon
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
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-200"
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-sm opacity-70 mt-1">{subtitle}</p>}
        </div>
        {Icon && <Icon className="h-8 w-8 opacity-60" />}
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

const IrrigationAnalytics = ({ district, village }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/districts/${district}/villages/${village}/irrigation-analytics`);
        if (!response.ok) throw new Error('Failed to fetch irrigation data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (district && village) {
      fetchData();
    }
  }, [district, village]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Irrigation Data</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Irrigation Data</h3>
        <p className="text-yellow-600">{data?.message || 'No irrigation information available for this village.'}</p>
      </div>
    );
  }

  // Water Sources Chart Data
  const waterSourcesData = {
    labels: [
      'Wells',
      'Hand Pumps', 
      'Tube Wells',
      'River/Canal',
      'River/Canal (Year-round)',
      'Tank/Pond/Lake'
    ],
    datasets: [{
      label: 'Water Source Availability',
      data: [
        data.waterSources.wellFunctioning ? 1 : 0,
        data.waterSources.handPumpFunctioning ? 1 : 0,
        data.waterSources.tubeWellFunctioning ? 1 : 0,
        data.waterSources.riverCanalStatus ? 1 : 0,
        data.waterSources.riverCanalAllYear ? 1 : 0,
        data.waterSources.tankPondLakeAllYear ? 1 : 0
      ],
      backgroundColor: [
        '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'
      ],
      borderColor: [
        '#2563EB', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2'
      ],
      borderWidth: 2
    }]
  };

  // Irrigation Methods Area Chart Data
  const irrigationMethodsData = {
    labels: ['Canals', 'Wells/Tube Wells', 'Tanks/Lakes', 'Waterfall', 'Other Sources'],
    datasets: [{
      label: 'Area Irrigated (Hectares)',
      data: [
        data.irrigationMethods.canalsArea,
        data.irrigationMethods.wellsTubeWellsArea,
        data.irrigationMethods.tanksLakesArea,
        data.irrigationMethods.waterfallArea,
        data.irrigationMethods.otherSourceArea
      ],
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: 2
    }]
  };

  // Land Usage Breakdown Chart Data
  const landUsageData = {
    labels: ['Irrigated Area', 'Unirrigated Area'],
    datasets: [{
      data: [
        data.landUsage.areaIrrigatedBySource,
        data.landUsage.totalUnirrigatedArea
      ],
      backgroundColor: ['#10B981', '#EF4444'],
      borderColor: ['#059669', '#DC2626'],
      borderWidth: 2
    }]
  };

  // Irrigation Coverage Radar Chart Data
  const radarData = {
    labels: [
      'Irrigation Coverage',
      'Water Source Score',
      'Irrigation Efficiency',
      'Land Utilization'
    ],
    datasets: [{
      label: 'Irrigation Metrics',
      data: [
        data.metrics.irrigationCoverage,
        data.metrics.waterSourceScore,
        data.metrics.irrigationEfficiency,
        100 - data.metrics.unirrigatedPercentage
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#374151',
        borderWidth: 1
      }
    }
  };

  const radarOptions = {
    ...chartOptions,
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return 'green';
      case 'Good': return 'blue';
      case 'Moderate': return 'yellow';
      case 'Limited': return 'orange';
      case 'Poor': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CircleStackIcon className="h-8 w-8" />
          Irrigation Analytics Dashboard
        </h1>
        <p className="mt-2 opacity-90">
          {village}, {district} - Water Resources and Irrigation Infrastructure Analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Irrigation Coverage"
          value={`${data.metrics.irrigationCoverage}%`}
          subtitle={`${data.metrics.status} coverage`}
          icon={ChartBarIcon}
          color={getStatusColor(data.metrics.status)}
        />
        <StatCard
          title="Water Sources"
          value={data.metrics.waterSourceCount}
          subtitle={`${data.metrics.waterSourceScore}% availability`}
          icon={CircleStackIcon}
          color="blue"
        />
        <StatCard
          title="Primary Method"
          value={data.metrics.primaryMethod}
          subtitle="Main irrigation source"
          icon={BeakerIcon}
          color="purple"
        />
        <StatCard
          title="Irrigation Efficiency"
          value={`${data.metrics.irrigationEfficiency}%`}
          subtitle="of sown area irrigated"
          icon={CpuChipIcon}
          color="green"
        />
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Population"
          value={data.demographics.totalPopulation.toLocaleString()}
          subtitle={`${data.demographics.totalHouseholds} households`}
          icon={MapIcon}
          color="blue"
        />
        <StatCard
          title="Geographical Area"
          value={`${data.demographics.geographicalArea} ha`}
          subtitle="Total village area"
          icon={MapIcon}
          color="green"
        />
        <StatCard
          title="Net Area Sown"
          value={`${data.landUsage.netAreaSown} ha`}
          subtitle="Cultivated land"
          icon={SunIcon}
          color="yellow"
        />
        <StatCard
          title="Unirrigated Land"
          value={`${data.metrics.unirrigatedPercentage}%`}
          subtitle={`${data.landUsage.totalUnirrigatedArea} hectares`}
          icon={MapIcon}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Water Source Availability">
          <div className="h-80">
            <Bar data={waterSourcesData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Land Usage Distribution">
          <div className="h-80">
            <Doughnut data={landUsageData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Irrigation Methods by Area">
          <div className="h-80">
            <Bar data={irrigationMethodsData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Irrigation Performance Metrics">
          <div className="h-80">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </ChartCard>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Strengths</h3>
          <ul className="space-y-2">
            {data.insights.strengths.map((strength, index) => (
              <li key={index} className="text-green-700 flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-800 mb-4">Areas for Improvement</h3>
          <ul className="space-y-2">
            {data.insights.improvements.map((improvement, index) => (
              <li key={index} className="text-orange-700 flex items-start">
                <span className="text-orange-500 mr-2">⚠</span>
                {improvement}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {data.insights.recommendations.map((recommendation, index) => (
              <li key={index} className="text-blue-700 flex items-start">
                <span className="text-blue-500 mr-2">💡</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Water Source Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className={`p-3 rounded text-center ${data.waterSources.wellFunctioning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">Wells</div>
            <div className="text-sm">{data.waterSources.wellFunctioning ? 'Available' : 'Not Available'}</div>
          </div>
          <div className={`p-3 rounded text-center ${data.waterSources.handPumpFunctioning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">Hand Pumps</div>
            <div className="text-sm">{data.waterSources.handPumpFunctioning ? 'Available' : 'Not Available'}</div>
          </div>
          <div className={`p-3 rounded text-center ${data.waterSources.tubeWellFunctioning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">Tube Wells</div>
            <div className="text-sm">{data.waterSources.tubeWellFunctioning ? 'Available' : 'Not Available'}</div>
          </div>
          <div className={`p-3 rounded text-center ${data.waterSources.riverCanalStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">River/Canal</div>
            <div className="text-sm">{data.waterSources.riverCanalStatus ? 'Available' : 'Not Available'}</div>
          </div>
          <div className={`p-3 rounded text-center ${data.waterSources.riverCanalAllYear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">Year-round Canal</div>
            <div className="text-sm">{data.waterSources.riverCanalAllYear ? 'Available' : 'Not Available'}</div>
          </div>
          <div className={`p-3 rounded text-center ${data.waterSources.tankPondLakeAllYear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">Tank/Pond/Lake</div>
            <div className="text-sm">{data.waterSources.tankPondLakeAllYear ? 'Available' : 'Not Available'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrrigationAnalytics;