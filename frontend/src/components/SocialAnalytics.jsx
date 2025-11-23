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
  BanknotesIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  TrophyIcon,
  MapPinIcon,
  ChartBarIcon
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
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200"
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

const SocialAnalytics = ({ district, village }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/districts/${district}/villages/${village}/social-analytics`);
        if (!response.ok) throw new Error('Failed to fetch social data');
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
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Social Data</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Social Data</h3>
        <p className="text-yellow-600">{data?.message || 'No social information available for this village.'}</p>
      </div>
    );
  }

  // Service Availability Chart Data
  const serviceAvailabilityData = {
    labels: ['Financial Services', 'Market Facilities', 'Community Services', 'Recreational Facilities'],
    datasets: [{
      label: 'Number of Services Available',
      data: [
        data.scores.financialScore,
        data.scores.marketScore,
        data.scores.communityScore,
        data.scores.recreationalScore
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
      borderColor: ['#2563EB', '#059669', '#7C3AED', '#D97706'],
      borderWidth: 2
    }]
  };

  // Financial Services Detail Chart
  const financialServicesData = {
    labels: ['Banks', 'Agricultural Credit Societies', 'Agricultural Marketing Society'],
    datasets: [{
      label: 'Service Availability',
      data: [
        data.financialServices.banks ? 1 : 0,
        data.financialServices.agricreditSocieties ? 1 : 0,
        data.financialServices.agriculturalMarketingSociety ? 1 : 0
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6'],
      borderColor: ['#2563EB', '#059669', '#7C3AED'],
      borderWidth: 2
    }]
  };

  // Community & Market Services Chart
  const communityMarketData = {
    labels: [
      'ASHA Worker',
      'Community Centre',
      'Public Library',
      'Polling Station',
      'Regular Market',
      'Weekly Haat'
    ],
    datasets: [{
      label: 'Service Availability',
      data: [
        data.communityServices.asha ? 1 : 0,
        data.communityServices.communityCentreWithTV ? 1 : 0,
        data.communityServices.publicLibrary ? 1 : 0,
        data.communityServices.assemblyPollingStation ? 1 : 0,
        data.marketFacilities.mandisRegularMarket ? 1 : 0,
        data.marketFacilities.weeklyHaat ? 1 : 0
      ],
      backgroundColor: '#10B981',
      borderColor: '#059669',
      borderWidth: 2
    }]
  };

  // Social Infrastructure Performance Radar Chart
  const radarData = {
    labels: [
      'Financial Services',
      'Market Access',
      'Community Services',
      'Recreation',
      'Overall Accessibility'
    ],
    datasets: [{
      label: 'Social Infrastructure Metrics',
      data: [
        (data.scores.financialScore / 3) * 100, // Max 3 financial services
        (data.scores.marketScore / 2) * 100, // Max 2 market facilities
        (data.scores.communityScore / 4) * 100, // Max 4 community services
        (data.scores.recreationalScore / 2) * 100, // Max 2 recreational facilities
        data.scores.accessibilityScore
      ],
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8B5CF6',
      borderWidth: 2,
      pointBackgroundColor: '#8B5CF6',
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
      case 'Fair': return 'yellow';
      case 'Poor': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserGroupIcon className="h-8 w-8" />
          Social Infrastructure Analytics Dashboard
        </h1>
        <p className="mt-2 opacity-90">
          {village}, {district} - Community Services and Social Facilities Analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Social Infrastructure"
          value={`${data.scores.socialInfrastructureIndex}%`}
          subtitle={`${data.scores.quality} quality`}
          icon={ChartBarIcon}
          color={getStatusColor(data.scores.quality)}
        />
        <StatCard
          title="Financial Services"
          value={data.scores.financialScore}
          subtitle="out of 3 available"
          icon={BanknotesIcon}
          color="blue"
        />
        <StatCard
          title="Market Access"
          value={data.scores.marketScore}
          subtitle="out of 2 facilities"
          icon={ShoppingBagIcon}
          color="green"
        />
        <StatCard
          title="Community Services"
          value={data.scores.communityScore}
          subtitle="out of 4 services"
          icon={UserGroupIcon}
          color="purple"
        />
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Population"
          value={data.demographics.totalPopulation.toLocaleString()}
          subtitle={`${data.demographics.totalHouseholds} households`}
          icon={UserGroupIcon}
          color="blue"
        />
        <StatCard
          title="Population Density"
          value={`${data.demographics.populationDensity}/ha`}
          subtitle="people per hectare"
          icon={MapPinIcon}
          color="green"
        />
        <StatCard
          title="Recreational Score"
          value={data.scores.recreationalScore}
          subtitle="out of 2 facilities"
          icon={TrophyIcon}
          color="orange"
        />
        <StatCard
          title="Accessibility Score"
          value={`${data.scores.accessibilityScore}%`}
          subtitle="service proximity"
          icon={MapPinIcon}
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Service Category Overview">
          <div className="h-80">
            <Bar data={serviceAvailabilityData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Financial Services Availability">
          <div className="h-80">
            <Doughnut data={financialServicesData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Community & Market Services">
          <div className="h-80">
            <Bar data={communityMarketData} options={chartOptions} />
          </div>
        </ChartCard>

        <ChartCard title="Social Infrastructure Performance">
          <div className="h-80">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </ChartCard>
      </div>

      {/* Service Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Financial Services</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded flex justify-between items-center ${data.financialServices.banks ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Banks</span>
              <span className="text-sm">{data.financialServices.banks ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.financialServices.agricreditSocieties ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Agricultural Credit Societies</span>
              <span className="text-sm">{data.financialServices.agricreditSocieties ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.financialServices.agriculturalMarketingSociety ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Agricultural Marketing Society</span>
              <span className="text-sm">{data.financialServices.agriculturalMarketingSociety ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Market Facilities</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded flex justify-between items-center ${data.marketFacilities.mandisRegularMarket ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Regular Market/Mandi</span>
              <span className="text-sm">{data.marketFacilities.mandisRegularMarket ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.marketFacilities.weeklyHaat ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Weekly Haat</span>
              <span className="text-sm">{data.marketFacilities.weeklyHaat ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Community & Recreational Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Community Services</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded flex justify-between items-center ${data.communityServices.asha ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">ASHA Worker</span>
              <span className="text-sm">{data.communityServices.asha ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.communityServices.communityCentreWithTV ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Community Centre with TV</span>
              <span className="text-sm">{data.communityServices.communityCentreWithTV ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.communityServices.publicLibrary ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Public Library</span>
              <span className="text-sm">{data.communityServices.publicLibrary ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.communityServices.assemblyPollingStation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Assembly Polling Station</span>
              <span className="text-sm">{data.communityServices.assemblyPollingStation ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-800 mb-4">Recreational Facilities</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded flex justify-between items-center ${data.recreationalFacilities.sportsField ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Sports Field</span>
              <span className="text-sm">{data.recreationalFacilities.sportsField ? 'Available' : 'Not Available'}</span>
            </div>
            <div className={`p-3 rounded flex justify-between items-center ${data.recreationalFacilities.sportsClubRecreation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="font-medium">Sports Club/Recreation Centre</span>
              <span className="text-sm">{data.recreationalFacilities.sportsClubRecreation ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default SocialAnalytics;