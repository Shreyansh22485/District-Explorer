import React, { useState, useEffect } from 'react'
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import {
  SunIcon,
  AcademicCapIcon,
  HeartIcon,
  BuildingOfficeIcon,
  CircleStackIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

const SECTOR_INFO = {
  agriculture: {
    icon: SunIcon,
    color: 'from-green-500 to-emerald-600',
    title: 'Agriculture',
    description: 'Agricultural land use, cropping patterns, and farming infrastructure',
    apiKey: 'agriculture'
  },
  education: {
    icon: AcademicCapIcon,
    color: 'from-blue-500 to-indigo-600',
    title: 'Education',
    description: 'Educational infrastructure, enrollment rates, and accessibility',
    apiKey: 'education'
  },
  health: {
    icon: HeartIcon,
    color: 'from-red-500 to-pink-600',
    title: 'Health',
    description: 'Healthcare facilities, maternal & child health, and medical accessibility',
    apiKey: 'health'
  },
  infra: {
    icon: BuildingOfficeIcon,
    color: 'from-gray-500 to-slate-600',
    title: 'Infrastructure',
    description: 'Roads, electricity, communication, and basic village infrastructure',
    apiKey: 'infra'
  },
  irrigation: {
    icon: CircleStackIcon,
    color: 'from-cyan-500 to-blue-600',
    title: 'Irrigation',
    description: 'Water sources, irrigation methods, and water management infrastructure',
    apiKey: 'irrigation'
  },
  social: {
    icon: UserGroupIcon,
    color: 'from-purple-500 to-indigo-600',
    title: 'Social',
    description: 'Demographics, caste composition, workforce participation, and social infrastructure',
    apiKey: 'social'
  }
}

export default function Sectors({ onBack }) {
  const [selectedSector, setSelectedSector] = useState(null)
  const [sectorData, setSectorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/sectors/statistics`)
      .then(r => r.json())
      .then(data => {
        setSectorData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const SectorCard = ({ sectorKey, info }) => {
    const Icon = info.icon
    const data = sectorData?.[info.apiKey]
    const featureCount = data?.features?.length || 0
    
    return (
      <button
        onClick={() => setSelectedSector(sectorKey)}
        className="group bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-xl hover:border-indigo-300 transition-all text-left h-full"
      >
        <div className="flex flex-col h-full">
          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
            {info.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
            {info.description}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm">
              <span className="text-gray-500">Indicators: </span>
              <span className="font-semibold text-indigo-600">{featureCount}</span>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </button>
    )
  }

  const SectorDetail = ({ sectorKey, info }) => {
    const Icon = info.icon
    const data = sectorData?.[info.apiKey]
    
    if (!data) return null

    // Generate chart data based on sector
    const getChartData = () => {
      switch (sectorKey) {
        case 'agriculture':
          return {
            type: 'bar',
            data: {
              labels: ['Avg Area', 'Avg Population', 'Avg Households', 'Avg Forest Area'],
              datasets: [{
                label: 'Agriculture Stats',
                data: [data.avgAreaPerVillage, data.avgPopulation / 10, data.avgHouseholds, data.avgForestArea],
                backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(34, 197, 94, 0.9)'],
                borderColor: ['rgb(34, 197, 94)', 'rgb(59, 130, 246)', 'rgb(168, 85, 247)', 'rgb(34, 197, 94)'],
                borderWidth: 1
              }]
            },
            doughnut: {
              labels: ['Wheat Cultivation', 'Rice Cultivation', 'Other'],
              datasets: [{
                data: [data.wheatCultivation, data.riceCultivation, 100 - (data.wheatCultivation || 0) - (data.riceCultivation || 0)],
                backgroundColor: ['rgba(251, 191, 36, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(209, 213, 219, 0.5)'],
                borderWidth: 0
              }]
            }
          }
        case 'education':
          return {
            type: 'bar',
            data: {
              labels: ['Schools per Village', 'Schools per 1000 People'],
              datasets: [{
                label: 'Count',
                data: [parseFloat(data.avgSchoolsPerVillage), parseFloat(data.schoolsPerThousand)],
                backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(99, 102, 241, 0.7)'],
                borderColor: ['rgb(59, 130, 246)', 'rgb(99, 102, 241)'],
                borderWidth: 1
              }]
            }
          }
        case 'health':
          return {
            type: 'bar',
            data: {
              labels: ['Avg Distance to PHC (km)', 'Avg Distance to Sub-Centre (km)', 'Avg Village Population'],
              datasets: [{
                label: 'Value',
                data: [parseFloat(data.avgDistanceToPHC), parseFloat(data.avgDistanceToSubCentre), data.avgPopulation / 100],
                backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(99, 102, 241, 0.7)'],
                borderColor: ['rgb(239, 68, 68)', 'rgb(236, 72, 153)', 'rgb(99, 102, 241)'],
                borderWidth: 1
              }]
            },
            doughnut: {
              labels: ['Within 5km PHC', 'Within 5km Sub-Centre', 'Beyond 5km'],
              datasets: [{
                data: [
                  data.within5kmPHC,
                  data.within5kmSubCentre,
                  100 - Math.max(data.within5kmPHC, data.within5kmSubCentre)
                ],
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 0
              }]
            }
          }
        case 'infra':
          return {
            type: 'doughnut',
            doughnut: {
              labels: ['Water Access', 'Road Access', 'No Access'],
              datasets: [{
                data: [
                  data.waterAccessPercentage,
                  data.roadAccessPercentage,
                  100 - Math.max(data.waterAccessPercentage, data.roadAccessPercentage)
                ],
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(107, 114, 128, 0.8)',
                  'rgba(209, 213, 219, 0.5)'
                ],
                borderWidth: 0
              }]
            }
          }
        case 'irrigation':
          return {
            type: 'bar',
            data: {
              labels: ['Avg Irrigated Land (ha)', 'Avg Water Sources'],
              datasets: [{
                label: 'Count',
                data: [data.avgIrrigatedLand, parseFloat(data.avgWaterSources)],
                backgroundColor: ['rgba(6, 182, 212, 0.7)', 'rgba(59, 130, 246, 0.7)'],
                borderColor: ['rgb(6, 182, 212)', 'rgb(59, 130, 246)'],
                borderWidth: 1
              }]
            }
          }
        case 'social':
          return {
            type: 'doughnut',
            doughnut: {
              labels: ['Financial Services', 'Market Facilities', 'No Coverage'],
              datasets: [{
                data: [
                  data.financialServiceCoverage,
                  data.marketFacilityCoverage,
                  100 - Math.max(data.financialServiceCoverage, data.marketFacilityCoverage)
                ],
                backgroundColor: [
                  'rgba(168, 85, 247, 0.8)',
                  'rgba(99, 102, 241, 0.8)',
                  'rgba(209, 213, 219, 0.5)'
                ],
                borderWidth: 0
              }]
            }
          }
        default:
          return null
      }
    }

    const chartConfig = getChartData()
    const stats = getStats()

    function getStats() {
      switch (sectorKey) {
        case 'agriculture':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Avg Area per Village', value: `${data.avgAreaPerVillage} hectares` },
            { label: 'Avg Population', value: data.avgPopulation.toLocaleString() },
            { label: 'Avg Households', value: data.avgHouseholds },
            { label: 'Avg Forest Area', value: `${data.avgForestArea} hectares` },
            { label: 'Wheat Cultivation', value: `${data.wheatCultivation}% villages` },
            { label: 'Rice Cultivation', value: `${data.riceCultivation}% villages` }
          ]
        case 'education':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Avg Schools per Village', value: data.avgSchoolsPerVillage },
            { label: 'Total Population', value: data.totalPopulation.toLocaleString() },
            { label: 'Schools per 1000 People', value: data.schoolsPerThousand }
          ]
        case 'health':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Avg Distance to PHC', value: `${data.avgDistanceToPHC} km` },
            { label: 'Avg Distance to Sub-Centre', value: `${data.avgDistanceToSubCentre} km` },
            { label: 'Within 5km of PHC', value: `${data.within5kmPHC}% villages` },
            { label: 'Within 5km of Sub-Centre', value: `${data.within5kmSubCentre}% villages` },
            { label: 'Avg Population per Village', value: data.avgPopulation.toLocaleString() }
          ]
        case 'infra':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Water Access Coverage', value: `${data.waterAccessPercentage}%` },
            { label: 'Road Access Coverage', value: `${data.roadAccessPercentage}%` }
          ]
        case 'irrigation':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Avg Irrigated Land', value: `${data.avgIrrigatedLand} hectares` },
            { label: 'Avg Water Sources', value: data.avgWaterSources }
          ]
        case 'social':
          return [
            { label: 'Total Villages Analyzed', value: data.totalVillages },
            { label: 'Financial Service Coverage', value: `${data.financialServiceCoverage}%` },
            { label: 'Market Facility Coverage', value: `${data.marketFacilityCoverage}%` }
          ]
        default:
          return []
      }
    }
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className={`p-8 bg-gradient-to-br ${info.color} text-white rounded-t-2xl`}>
          <button
            onClick={() => setSelectedSector(null)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-sm">Back to all sectors</span>
          </button>
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{info.title}</h2>
              <p className="text-white/90 text-lg">{info.description}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Statistics Grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-900">Key Statistics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          {chartConfig && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-purple-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-900">Visual Analytics</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartConfig.data && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      Metrics Overview
                    </h4>
                    <div className="bg-white rounded-lg p-4">
                      <Bar
                        data={chartConfig.data}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { display: false },
                            title: { display: false }
                          },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                {chartConfig.doughnut && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                      Coverage Distribution
                    </h4>
                    <div className="bg-white rounded-lg p-4">
                      <Doughnut
                        data={chartConfig.doughnut}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'bottom' }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-1 bg-green-600 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-900">Key Indicators Tracked</h3>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {data.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold mb-1">Village-Specific Analysis</h4>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  The statistics above represent state-wide aggregations across all analyzed villages in Haryana. 
                  For detailed, village-specific analytics in this sector, use the Search or Browse features 
                  to select a specific village and explore its unique development profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sector statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Data</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h1 className="text-4xl font-bold">Development Sectors</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          {!selectedSector 
            ? 'Explore state-wide statistics across six key development sectors' 
            : `Detailed analytics for ${SECTOR_INFO[selectedSector].title} sector`}
        </p>
      </div>

      {!selectedSector ? (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">About Our Multi-Sector Analysis</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our comprehensive platform examines six critical development sectors to provide
                  a holistic view of rural development across Haryana. Each sector is analyzed using multiple 
                  indicators, statistical methods, and comparative metrics to identify development patterns, 
                  gaps, and opportunities. Click on any sector below to view detailed state-wide statistics.
                </p>
              </div>
            </div>
          </div>

          {/* Sector Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(SECTOR_INFO).map(([key, info]) => (
              <SectorCard key={key} sectorKey={key} info={info} />
            ))}
          </div>
        </div>
      ) : (
        <SectorDetail sectorKey={selectedSector} info={SECTOR_INFO[selectedSector]} />
      )}
    </div>
  )
}
