import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'dashboard'
  const [selectedLocation, setSelectedLocation] = useState('bengaluru');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState('soil_moisture'); 
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Locations with corresponding icons
  const locationMap = {
    bengaluru: { name: 'Bengaluru', emoji: '🌆', region: 'Karnataka (South)' },
    delhi: { name: 'Delhi', emoji: '🏛️', region: 'NCR (North)' },
    mumbai: { name: 'Mumbai', emoji: '🌊', region: 'Maharashtra (West)' },
    chennai: { name: 'Chennai', emoji: '🌴', region: 'Tamil Nadu (South-East)' },
    jaipur: { name: 'Jaipur', emoji: '🏰', region: 'Rajasthan (North-West)' }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setHoveredPoint(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_name: selectedLocation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Failed to fetch prediction');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAdvisory = () => {
    if (!data || !data.predictions) return null;
    const levels = Object.values(data.predictions).map(p => p.level);
    if (levels.includes('High Risk')) {
      return {
        badge: '🚨 CRITICAL ADVISORY',
        title: 'Severe Root-Zone Moisture Depletion Alert',
        text: 'Immediate water rationing, agricultural irrigation caps, and ground-water monitoring protocols are recommended for regional authorities.',
        bg: '#fef2f2', border: '#ef4444', color: '#991b1b', icon: '🚨'
      };
    } else if (levels.includes('Moderate Risk')) {
      return {
        badge: '⚠️ MODERATE CAUTION',
        title: 'Soil Moisture Stress Detected',
        text: 'Localized soil dryness observed. Optimize crop irrigation cycles and closely monitor reservoir levels over the coming 30 days.',
        bg: '#fffbeb', border: '#f59e0b', color: '#92400e', icon: '⚠️'
      };
    } else {
      return {
        badge: '✅ OPTIMAL CONDITIONS',
        title: 'Stable Hydro-Climatic Indicators',
        text: 'Current moisture and precipitation indices align with normal seasonal ranges. Standard management applies.',
        bg: '#f0fdf4', border: '#059669', color: '#065f46', icon: '✅'
      };
    }
  };

  const advisory = getAdvisory();
  const chartValues = data?.trend_data ? data.trend_data[activeChart] : [];
  const maxVal = chartValues.length > 0 ? Math.max(...chartValues, activeChart === 'soil_moisture' ? 0.5 : 50) : 1;

  // Compute summary values for executive KPI widgets
  const currentRisk = data?.predictions?.current;
  const highestRisk = data?.predictions ? Object.values(data.predictions).reduce((prev, curr) => {
    const ranks = { "Low Risk": 1, "Moderate Risk": 2, "High Risk": 3 };
    return (ranks[curr.level] || 0) > (ranks[prev.level] || 0) ? curr : prev;
  }, { level: 'Low Risk', color: '#10b981' }) : null;

  return (
    <div className="app-wrapper">
      {view === 'home' ? (
        /* ================= HOME PAGE ================= */
        <div className="home-container">
          <div className="hero-banner">
            <div className="hero-badge">💧 Climate & Hydrological Intelligence v2.0</div>
            <h1 className="hero-heading">India Multi-Horizon Drought Risk Platform</h1>
            <p className="hero-desc">
              Precision machine learning models paired with real-time satellite meteorology to forecast agricultural and hydrological drought risks up to 60 days in advance.
            </p>
            <button className="hero-cta" onClick={() => setView('dashboard')}>
              Launch Prediction Engine ⚡
            </button>
          </div>

          <div className="features-container">
            <div className="feature-box">
              <div className="feature-icon-wrapper">🎯</div>
              <h3>Multi-Horizon Machine Learning</h3>
              <p>Predict risk scores across 5 temporal horizons: Current, 7-Day, 15-Day, 30-Day, and 60-Day projections.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">🛰️</div>
              <h3>Open-Meteo Satellite Integration</h3>
              <p>Continuous retrieval of root-zone soil moisture (0-7cm) and daily precipitation totals for maximum accuracy.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">📍</div>
              <h3>Cluster Regional Tracking</h3>
              <p>Monitors central metro hubs alongside surrounding agricultural nodes for comprehensive watershed mapping.</p>
            </div>
          </div>
        </div>
      ) : (
        /* ================= PREDICTION DASHBOARD PAGE ================= */
        <div className="dashboard-container">
          {/* Top Bar Navigation - Clean 3-Column Layout */}
          <nav className="dashboard-nav">
            <div className="nav-left">
              <button className="nav-back-btn" onClick={() => setView('home')}>
                ← Back to Overview
              </button>
            </div>
            
            <div className="nav-title-group">
              <h2>🌐 Hydrological Analytics Studio</h2>
              <p>AI Drought Forecasting & Meteorological Monitoring</p>
            </div>
            
            <div className="nav-right">
              <div className="nav-status-badge">
                <span className="pulse-dot"></span> System Ready
              </div>
            </div>
          </nav>

          {/* Interactive Selection Control Card */}
          <div className="control-card">
            <div className="control-header">
              <span className="control-badge">🎯 LOCATION SELECTOR</span>
              <h3 className="control-title">Choose Targeted Regional Monitoring Hub</h3>
            </div>
            
            <div className="control-flex">
              <div className="select-wrapper">
                <span className="select-icon">{locationMap[selectedLocation]?.emoji}</span>
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="location-select"
                >
                  {Object.entries(locationMap).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.emoji} {item.name} ({item.region})
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handlePredict} 
                disabled={loading}
                className="predict-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Running Models...
                  </>
                ) : (
                  <>⚡ Predict Drought Risk</>
                )}
              </button>
            </div>
            {error && <div className="error-banner">⚠️ {error}</div>}
          </div>

          {data && (
            <div className="results-wrapper">
              
              {/* Executive Summary Cards (KPI Widgets) */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon">📍</div>
                  <div className="kpi-info">
                    <span className="kpi-label">TARGET LOCATION</span>
                    <h4 className="kpi-value">{locationMap[selectedLocation]?.emoji} {data.location}</h4>
                    <span className="kpi-sub font-mono">{data.latitude}°N, {data.longitude}°E</span>
                  </div>
                </div>

                <div className="kpi-card" style={{ borderLeft: `4px solid ${currentRisk?.color}` }}>
                  <div className="kpi-icon">⏱️</div>
                  <div className="kpi-info">
                    <span className="kpi-label">CURRENT RISK</span>
                    <h4 className="kpi-value" style={{ color: currentRisk?.color }}>{currentRisk?.level}</h4>
                    <span className="kpi-sub">Baseline Moisture Index</span>
                  </div>
                </div>

                <div className="kpi-card" style={{ borderLeft: `4px solid ${highestRisk?.color}` }}>
                  <div className="kpi-icon">📊</div>
                  <div className="kpi-info">
                    <span className="kpi-label">MAX HORIZON RISK</span>
                    <h4 className="kpi-value" style={{ color: highestRisk?.color }}>{highestRisk?.level}</h4>
                    <span className="kpi-sub">60-Day Peak Exposure</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon">🛰️</div>
                  <div className="kpi-info">
                    <span className="kpi-label">STATIONS TRACKED</span>
                    <h4 className="kpi-value">1 Main + {data.nearby_predictions?.length || 0} Nearby</h4>
                    <span className="kpi-sub">Spatial Grid Active</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Advisory Banner */}
              {advisory && (
                <div className="advisory-card" style={{ backgroundColor: advisory.bg, borderLeft: `6px solid ${advisory.border}` }}>
                  <div className="advisory-header">
                    <span className="advisory-icon">{advisory.icon}</span>
                    <div>
                      <span className="advisory-badge" style={{ color: advisory.color, borderColor: advisory.color }}>{advisory.badge}</span>
                      <h3 style={{ color: advisory.color }}>{advisory.title}</h3>
                    </div>
                  </div>
                  <p style={{ color: advisory.color }}>{advisory.text}</p>
                </div>
              )}

              {/* Multi-Horizon Horizon Forecast Grid */}
              <div className="forecast-section">
                <div className="section-title-wrapper">
                  <span className="section-badge">🔮 MULTI-HORIZON PROJECTIONS</span>
                  <h2 className="section-header">Target Forecast for {locationMap[selectedLocation]?.emoji} {data.location}</h2>
                </div>

                <div className="horizon-grid">
                  {Object.entries(data.predictions).map(([horizon, info]) => (
                    <div key={horizon} className="horizon-card" style={{ borderTop: `4px solid ${info.color}` }}>
                      <div className="horizon-card-header">
                        <span className="horizon-label">{horizon.replace('_', ' ').toUpperCase()}</span>
                        <span className="horizon-tag" style={{ backgroundColor: info.color + '20', color: info.color }}>
                          {info.level}
                        </span>
                      </div>
                      <h3 className="horizon-level" style={{ color: info.color }}>{info.level}</h3>
                      <p className="horizon-desc">{info.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Trend Analytics Chart */}
              {data.trend_data && (
                <div className="forecast-section">
                  <div className="chart-header-row">
                    <div>
                      <span className="section-badge">📈 HISTORICAL DATA LOGS</span>
                      <h2 className="section-header">30-Day Meteorological Trend Line</h2>
                      <div className="coords-subtext">
                        {activeChart === 'soil_moisture' ? '🌱 Root-Zone Soil Moisture Index (0–7 cm)' : '🌧️ Daily Precipitation Accumulation (mm)'}
                      </div>
                    </div>
                    
                    <div className="chart-toggle-group">
                      <button 
                        onClick={() => { setActiveChart('soil_moisture'); setHoveredPoint(null); }}
                        className={`chart-toggle-btn ${activeChart === 'soil_moisture' ? 'active' : ''}`}
                      >
                        🌱 Soil Moisture
                      </button>
                      <button 
                        onClick={() => { setActiveChart('precipitation'); setHoveredPoint(null); }}
                        className={`chart-toggle-btn ${activeChart === 'precipitation' ? 'active' : ''}`}
                      >
                        🌧️ Precipitation
                      </button>
                    </div>
                  </div>

                  <div className="svg-wrapper">
                    <svg viewBox="0 0 600 200" className="svg-canvas">
                      {/* Background Gridlines */}
                      <line x1="20" y1="40" x2="580" y2="40" stroke="#e2e8f0" strokeDasharray="4" />
                      <line x1="20" y1="110" x2="580" y2="110" stroke="#e2e8f0" strokeDasharray="4" />
                      <line x1="20" y1="180" x2="580" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Line Trend Curve */}
                      <polyline
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chartValues.map((val, idx) => {
                          const x = (idx / (chartValues.length - 1)) * 560 + 20;
                          const y = 180 - (val / maxVal) * 140;
                          return `${x},${Math.max(20, Math.min(180, y))}`;
                        }).join(' ')}
                      />

                      {/* Data Point Circles */}
                      {chartValues.map((val, idx) => {
                        const x = (idx / (chartValues.length - 1)) * 560 + 20;
                        const y = 180 - (val / maxVal) * 140;
                        const clampedY = Math.max(20, Math.min(180, y));
                        const dateStr = data.trend_data.dates[idx] || `Day ${idx + 1}`;
                        const isHovered = hoveredPoint?.idx === idx;
                        return (
                          <g key={idx}>
                            <circle 
                              cx={x} 
                              cy={clampedY} 
                              r={isHovered ? "7" : "4.5"} 
                              fill={isHovered ? "#dc2626" : "#0f172a"} 
                              stroke="#ffffff"
                              strokeWidth="2"
                              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                              onMouseEnter={() => setHoveredPoint({ idx, val, date: dateStr })}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {hoveredPoint ? (
                      <div className="tooltip-box">
                        🗓️ <strong>{hoveredPoint.date}</strong> — Recorded Index: <strong>{hoveredPoint.val.toFixed(3)}</strong>
                      </div>
                    ) : (
                      <div className="tooltip-placeholder">💡 Hover over points along the curve to inspect daily weather telemetry.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Regional Stations Grid */}
              {data.nearby_predictions && data.nearby_predictions.length > 0 && (
                <div className="forecast-section">
                  <div className="section-title-wrapper">
                    <span className="section-badge">📍 SPATIAL RISK CORRIDORS</span>
                    <h2 className="section-header">Connected Monitoring Stations near {data.location}</h2>
                  </div>

                  <div className="nearby-grid">
                    {data.nearby_predictions.map((nb, index) => (
                      <div key={index} className="nearby-card">
                        <div className="nearby-header">
                          <span className="nearby-icon">🗺️</span>
                          <h4>{nb.name}</h4>
                        </div>
                        <div className="nearby-row">
                          <span>Current Status:</span>
                          <strong style={{ color: nb.predictions.current.color }}>{nb.predictions.current.level}</strong>
                        </div>
                        <div className="nearby-row">
                          <span>30-Day Outlook:</span>
                          <strong style={{ color: nb.predictions['30_days'].color }}>{nb.predictions['30_days'].level}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}