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
import { HeartIcon, UserGroupIcon, BuildingOffice2Icon, MapPinIcon } from '@heroicons/react/24/outline';

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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200"
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

const AccessibilityIndicator = ({ label, distance, icon }) => {
  const getDistanceColor = (distance) => {
    if (distance === 'In Village' || distance === '0' || distance === 0) return 'text-green-600 bg-green-100';
    if (distance === '5' || distance === 5 || distance === 'a') return 'text-yellow-600 bg-yellow-100';
    if (distance === '10' || distance === 10 || distance === 'b') return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getDistanceText = (distance) => {
    if (distance === 'In Village' || distance === '0' || distance === 0) return 'In Village';
    if (distance === '5' || distance === 5 || distance === 'a') return 'Within 5km';
    if (distance === '10' || distance === 10 || distance === 'b') return 'Within 10km';
    return 'Beyond 10km';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-gray-700">{label}</span>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDistanceColor(distance)}`}>
        {getDistanceText(distance)}
      </span>
    </div>
  );
};

const HealthAnalytics = ({ district, village }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!district || !village) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/districts/${district}/villages/${village}/health-analytics`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching health data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Health Data</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">{data?.message || 'No health data available'}</p>
      </div>
    );
  }

  // Prepare chart data
  const facilityLabels = ['CHC', 'PHC', 'Sub Centre', 'MCW Centre', 'TB Clinic', 'Hospital', 'Alternative Med', 'Dispensary', 'Veterinary', 'Mobile Clinic', 'Family Welfare'];
  const facilityValues = [
    data.facilities.communityHealthCentre,
    data.facilities.primaryHealthCentre,
    data.facilities.primaryHealthSubCentre,
    data.facilities.maternityChildWelfare,
    data.facilities.tbClinic,
    data.facilities.hospitalAllopathic,
    data.facilities.hospitalAlternative,
    data.facilities.dispensary,
    data.facilities.veterinaryHospital,
    data.facilities.mobileHealthClinic,
    data.facilities.familyWelfareCentre
  ];

  const facilityData = {
    labels: facilityLabels,
    datasets: [
      {
        label: 'Number of Facilities',
        data: facilityValues,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }
    ],
  };

  const demographicsData = {
    labels: ['Male', 'Female'],
    datasets: [{
      data: [data.demographics.malePopulation, data.demographics.femalePopulation],
      backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const staffingData = {
    labels: ['Required', 'In Position'],
    datasets: [{
      label: 'Doctor Staffing',
      data: [data.metrics.totalDoctorsRequired, data.metrics.totalDoctorsInPosition],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // Red for required (showing gap)
        'rgba(34, 197, 94, 0.8)'    // Green for in position
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 1,
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

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
    },
  };

  // Generate insights
  const insights = {
    strengths: [],
    improvements: []
  };

  if (data.metrics.staffingRatio >= 80) {
    insights.strengths.push(`Excellent doctor staffing at ${data.metrics.staffingRatio}%`);
  } else if (data.metrics.staffingRatio >= 60) {
    insights.strengths.push(`Good doctor staffing at ${data.metrics.staffingRatio}%`);
  }

  if (data.metrics.totalFacilities >= 3) {
    insights.strengths.push(`Multiple healthcare facilities available (${data.metrics.totalFacilities} total)`);
  }

  if (data.facilities.primaryHealthCentre > 0 || data.facilities.communityHealthCentre > 0) {
    insights.strengths.push('Has primary or community health center');
  }

  if (data.metrics.staffingRatio < 60) {
    insights.improvements.push(`Low doctor staffing at ${data.metrics.staffingRatio}% - need more doctors`);
  }

  if (data.metrics.totalFacilities === 0) {
    insights.improvements.push('No healthcare facilities in village - need basic health infrastructure');
  }

  if (data.facilities.primaryHealthCentre === 0 && data.facilities.communityHealthCentre === 0) {
    insights.improvements.push('Lacks primary healthcare infrastructure - needs PHC or CHC');
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HeartIcon className="h-8 w-8" />
          Health Analytics - {data.village}, {data.district}
        </h1>
        <p className="mt-2 opacity-90">Population Category: {data.demographics.populationCategory}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Population"
          value={data.demographics.totalPopulation.toLocaleString()}
          subtitle={`${data.demographics.households} households`}
          icon={UserGroupIcon}
          color="blue"
        />
        <StatCard
          title="Healthcare Facilities"
          value={data.metrics.totalFacilities}
          subtitle={`${data.metrics.facilitiesPerThousand} per 1000 people`}
          icon={BuildingOffice2Icon}
          color="green"
        />
        <StatCard
          title="Doctor Staffing"
          value={`${data.metrics.staffingRatio}%`}
          subtitle={`${data.metrics.totalDoctorsInPosition}/${data.metrics.totalDoctorsRequired} positions filled`}
          icon={HeartIcon}
          color={data.metrics.staffingRatio >= 80 ? "green" : data.metrics.staffingRatio >= 60 ? "yellow" : "red"}
        />
        <StatCard
          title="Population Gender"
          value={`${Math.round((data.demographics.femalePopulation/data.demographics.totalPopulation)*100)}% F`}
          subtitle={`${data.demographics.malePopulation}M / ${data.demographics.femalePopulation}F`}
          icon={MapPinIcon}
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Healthcare Facilities by Type">
          <div style={{ height: '300px' }}>
            <Bar data={facilityData} options={barChartOptions} />
          </div>
        </ChartCard>
        
        <ChartCard title="Population Demographics">
          <div style={{ height: '300px' }}>
            <Doughnut data={demographicsData} options={chartOptions} />
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Doctor Staffing Overview">
          <div style={{ height: '300px' }}>
            <Bar data={staffingData} options={barChartOptions} />
          </div>
        </ChartCard>
        
        <ChartCard title="Facility Accessibility Analysis">
          <div className="space-y-3">
            <AccessibilityIndicator label="Community Health Centre" distance={data.accessibility.chcDistance} icon="🏥" />
            <AccessibilityIndicator label="Primary Health Centre" distance={data.accessibility.phcDistance} icon="⚕️" />
            <AccessibilityIndicator label="Hospital (Allopathic)" distance={data.accessibility.hospitalDistance} icon="🏥" />
            <AccessibilityIndicator label="Dispensary" distance={data.accessibility.dispensaryDistance} icon="💊" />
            <AccessibilityIndicator label="TB Clinic" distance={data.accessibility.tbClinicDistance} icon="🩺" />
            <AccessibilityIndicator label="Family Welfare Centre" distance={data.accessibility.familyWelfareDistance} icon="👶" />
          </div>
        </ChartCard>
      </div>

      {/* Detailed Facility Information */}
      <ChartCard title="Healthcare Facility Details" className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-semibold text-blue-800 mb-2">Primary Healthcare</h4>
            <div className="space-y-1 text-sm">
              <div>Community Health Centre: {data.facilities.communityHealthCentre}</div>
              <div>Primary Health Centre: {data.facilities.primaryHealthCentre}</div>
              <div>Primary Health Sub Centre: {data.facilities.primaryHealthSubCentre}</div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-green-50">
            <h4 className="font-semibold text-green-800 mb-2">Specialized Care</h4>
            <div className="space-y-1 text-sm">
              <div>Hospital (Allopathic): {data.facilities.hospitalAllopathic}</div>
              <div>Alternative Medicine: {data.facilities.hospitalAlternative}</div>
              <div>TB Clinic: {data.facilities.tbClinic}</div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-purple-50">
            <h4 className="font-semibold text-purple-800 mb-2">Support Services</h4>
            <div className="space-y-1 text-sm">
              <div>Dispensary: {data.facilities.dispensary}</div>
              <div>Mobile Health Clinic: {data.facilities.mobileHealthClinic}</div>
              <div>Family Welfare Centre: {data.facilities.familyWelfareCentre}</div>
              <div>Veterinary Hospital: {data.facilities.veterinaryHospital}</div>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Key Strengths" className="border-green-200">
          <div className="space-y-3">
            {insights.strengths.length > 0 ? (
              insights.strengths.map((strength, index) => (
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
            {insights.improvements.length > 0 ? (
              insights.improvements.map((improvement, index) => (
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

export default HealthAnalytics;