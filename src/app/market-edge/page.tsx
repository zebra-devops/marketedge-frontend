'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { MarketSelector } from '@/components/market-edge/MarketSelector';
import { CompetitorTable } from '@/components/market-edge/CompetitorTable';
import { PricingChart } from '@/components/market-edge/PricingChart';
import { PerformanceMetrics } from '@/components/market-edge/PerformanceMetrics';
import { AlertsPanel } from '@/components/market-edge/AlertsPanel';
import { AccountMenu } from '@/components/ui/AccountMenu';
import { DummyDataToggle } from '@/components/ui/DummyDataToggle';
import { marketEdgeAPI } from '@/services/market-edge-api';
import { 
  Market, 
  MarketOverview, 
  MarketTrends, 
  CompetitorComparison 
} from '@/types/market-edge';

export default function MarketEdgePage() {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [pricingTrends, setPricingTrends] = useState<MarketTrends | null>(null);
  const [competitorComparison, setCompetitorComparison] = useState<CompetitorComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'competitors' | 'pricing' | 'alerts'>('overview');
  const [isDummyMode, setIsDummyMode] = useState(true); // Default to dummy mode for testing

  useEffect(() => {
    if (selectedMarket) {
      loadMarketData();
    }
  }, [selectedMarket, isDummyMode]); // Reload data when dummy mode changes

  const loadMarketData = async () => {
    if (!selectedMarket) return;

    setIsLoading(true);
    setError(null);

    try {
      const [overview, trends, comparison] = await Promise.all([
        marketEdgeAPI.getMarketOverview(selectedMarket.id),
        marketEdgeAPI.getPricingTrends(selectedMarket.id, { days_back: 30 }),
        marketEdgeAPI.compareCompetitors(selectedMarket.id)
      ]);

      setMarketOverview(overview);
      setPricingTrends(trends);
      setCompetitorComparison(comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = () => {
    loadMarketData();
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'competitors', name: 'Competitors', icon: UsersIcon },
    { id: 'pricing', name: 'Pricing Analysis', icon: ChartBarIcon },
    { id: 'alerts', name: 'Alerts', icon: ExclamationTriangleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Market Edge</h1>
              <span className="ml-3 text-sm text-gray-500">Competitive Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Dummy Data Toggle */}
              <DummyDataToggle
                isDummyMode={isDummyMode}
                onToggle={setIsDummyMode}
              />
              
              {/* Market Selector and Actions */}
              <div className="flex items-center space-x-4">
                <MarketSelector
                  selectedMarket={selectedMarket || undefined}
                  onMarketSelect={setSelectedMarket}
                  onCreateMarket={() => {
                    // This would open a create market modal
                    console.log('Create new market');
                  }}
                  className="w-64"
                />
                
                {selectedMarket && (
                  <button
                    onClick={handleRefreshData}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                )}
              </div>
              
              {/* Account Menu */}
              <AccountMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedMarket ? (
          // Welcome State
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Welcome to Market Edge</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-2xl mx-auto">
              Get started by selecting a market to analyze, or create a new market to begin tracking competitors and pricing data.
              {isDummyMode && (
                <span className="block mt-2 text-blue-600 font-medium">
                  Currently in test mode - select a market to see sample competitive intelligence data.
                </span>
              )}
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  // This would open market selector or create modal
                  console.log('Get started');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Get Started
              </button>
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Market Data</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={handleRefreshData}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Data Mode Banner */}
            {isDummyMode && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <BeakerIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Test Mode Active:</span> You're viewing sample competitive intelligence data for demonstration purposes.
                    Toggle to "Live" mode to connect to real data sources.
                  </p>
                </div>
              </div>
            )}
            
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Market Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <UsersIcon className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Competitors</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {marketOverview?.competitors.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Data Points</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {marketOverview?.recent_data_points || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Active Alerts</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {marketOverview?.recent_alerts.filter(a => !a.is_read).length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {marketOverview?.metrics && (
                  <PerformanceMetrics 
                    metrics={marketOverview.metrics} 
                    isLoading={isLoading}
                  />
                )}

                {/* Recent Alerts */}
                {marketOverview?.recent_alerts && (
                  <AlertsPanel
                    alerts={marketOverview.recent_alerts}
                    isLoading={isLoading}
                    onRefresh={handleRefreshData}
                  />
                )}
              </div>
            )}

            {activeTab === 'competitors' && (
              <div className="space-y-8">
                {marketOverview?.competitors && (
                  <CompetitorTable
                    competitors={marketOverview.competitors}
                    isLoading={isLoading}
                    onViewCompetitor={(competitor) => {
                      console.log('View competitor:', competitor);
                    }}
                    onEditCompetitor={(competitor) => {
                      console.log('Edit competitor:', competitor);
                    }}
                  />
                )}

                {competitorComparison && (
                  <PricingChart
                    data={competitorComparison}
                    chartType="bar"
                    title="Competitor Price Comparison"
                    height={400}
                  />
                )}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-8">
                {pricingTrends && (
                  <PricingChart
                    data={pricingTrends}
                    chartType="line"
                    title="Pricing Trends Over Time"
                    height={500}
                  />
                )}

                {marketOverview?.metrics && (
                  <PerformanceMetrics 
                    metrics={marketOverview.metrics} 
                    isLoading={isLoading}
                  />
                )}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-8">
                {marketOverview?.recent_alerts && (
                  <AlertsPanel
                    alerts={marketOverview.recent_alerts}
                    isLoading={isLoading}
                    onRefresh={handleRefreshData}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}