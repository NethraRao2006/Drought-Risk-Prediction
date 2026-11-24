import { useState } from 'react';
import './App.css';

const LOCATIONS = [
  { name: 'Latur_Marathwada_High', region: 'Latur, Maharashtra', lat: 18.40, lon: 76.57 },
  { name: 'Anantapur_Rayalaseema_High', region: 'Anantapur, Andhra Pradesh', lat: 14.68, lon: 77.60 },
  { name: 'Varanasi_UP_Moderate', region: 'Varanasi, Uttar Pradesh', lat: 25.33, lon: 83.00 },
  { name: 'Bengaluru_KA_Moderate', region: 'Bengaluru, Karnataka', lat: 12.97, lon: 77.59 },
  { name: 'Dakshina_Kannada_Low', region: 'Dakshina Kannada, Karnataka', lat: 12.87, lon: 74.88 }
];

const HORIZONS = [
  { key: 'current', label: 'Current', short: 'Now' },
  { key: '7_days', label: '7 days', short: '7D' },
  { key: '15_days', label: '15 days', short: '15D' },
  { key: '30_days', label: '30 days', short: '30D' },
  { key: '60_days', label: '60 days', short: '60D' }
];

function Icon({ name, size = 20 }) {
  const icons = {
    leaf: <><path d="M20 4C12 4 5 8 5 14c0 3 2 5 5 5 6 0 10-7 10-15Z" /><path d="M5 20c3-6 7-9 12-12" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    drop: <><path d="M12 2S5 9 5 15a7 7 0 0 0 14 0c0-6-7-13-7-13Z" /><path d="M9 16c.5 1.5 1.5 2 3 2" /></>,
    cloud: <><path d="M17 18H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 20 11a3.5 3.5 0 0 1-3 7Z" /></>,
    temperature: <><path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z" /><path d="M12 7v8" /></>,
    rain: <><path d="M7 16a4 4 0 1 1 1-7.9A5 5 0 0 1 17.7 9 3.5 3.5 0 0 1 18 16" /><path d="m8 20-1 2M12 20l-1 2M16 20l-1 2" /></>,
    satellite: <><rect x="8" y="8" width="8" height="8" rx="1" /><path d="m8 8-4-4M16 8l4-4M8 16l-4 4M16 16l4 4" /><path d="M2 7V3h4M22 7V3h-4M2 17v4h4M22 17v4h-4" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Go to home">
      <span className="brand-mark"><Icon name="leaf" size={19} /></span>
      <span>Drought<span>Lens</span></span>
    </button>
  );
}

function RiskBadge({ level }) {
  const key = level?.toLowerCase().replace(' ', '-') || 'low';
  return <span className={`risk-badge ${key}`}><span />{level}</span>;
}

function App() {
  const [view, setView] = useState('landing');
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0].name);
  const [activeHorizon, setActiveHorizon] = useState('current');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    const targetLoc = LOCATIONS.find(l => l.name === selectedLocation);
    await executeApiRequest(targetLoc.name);
  };

  const executeApiRequest = async (locationName) => {
    try {
      const response = await fetch('http://127.0.0.1:8001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_name: locationName }),
      });

      if (!response.ok) throw new Error('Failed to fetch prediction from the backend.');
      const result = await response.json();
      setData(result);
      setActiveHorizon('current');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const openDashboard = () => {
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const riskValue = (level) => level === 'High Risk' ? 2 : level === 'Moderate Risk' ? 1 : 0;
  const activePrediction = data?.predictions?.[activeHorizon];

  const riskPoints = data
    ? HORIZONS.map((horizon, index) => {
        const y = 155 - (riskValue(data.predictions[horizon.key]?.level) * 55);
        return `${40 + index * 130},${y}`;
      }).join(' ')
    : '';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-wrap">
          <Brand onClick={() => setView('landing')} />
          <nav className="nav-links">
            <button className={view === 'landing' ? 'active' : ''} onClick={() => setView('landing')}>Overview</button>
            <button className={view === 'dashboard' ? 'active' : ''} onClick={openDashboard}>Prediction center</button>
          </nav>
          <button className="nav-action" onClick={openDashboard}>Run analysis <Icon name="arrow" size={16} /></button>
        </div>
      </header>

      {view === 'landing' ? (
        <main>
          <section className="hero-section">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-content">
              <div className="hero-copy">
                <div className="eyebrow"><span /> Climate intelligence platform</div>
                <h1>See drought risk <em>before it unfolds.</em></h1>
                <p className="hero-lede">
                  Analyze live weather signals and forecast drought conditions across key Indian regions with multi-horizon machine learning insights.
                </p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={openDashboard}>Explore predictions <Icon name="arrow" /></button>
                  <button className="text-button" onClick={() => document.getElementById('methodology')?.scrollIntoView({ behavior: 'smooth' })}>
                    How it works
                  </button>
                </div>
                <div className="trust-row">
                  <div><strong>5</strong><span>Study regions</span></div>
                  <div><strong>5</strong><span>Forecast horizons</span></div>
                  <div><strong>Live</strong><span>Weather data</span></div>
                </div>
              </div>

              <div className="hero-visual" aria-label="Drought risk preview">
                <div className="visual-grid" />
                <div className="coverage-visual">
                  <div className="coverage-ring ring-outer" />
                  <div className="coverage-ring ring-inner" />
                  <div className="coverage-core">
                    <Icon name="leaf" size={36} />
                    <strong>Regional<br />coverage</strong>
                  </div>
                  {[
                    ['Latur', 'northwest'],
                    ['Anantapur', 'southwest'],
                    ['Varanasi', 'northeast'],
                    ['Bengaluru', 'south'],
                    ['Dakshina Kannada', 'west']
                  ].map(([label, position]) => (
                    <div className={`coverage-node ${position}`} key={label}>
                      <span />
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="feature-section" id="methodology">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Decision-ready intelligence</span>
                <h2>From weather signals to clear action.</h2>
              </div>
              <p>Five connected indicators provide a focused view of present conditions and short-to-medium-term drought risk.</p>
            </div>
            <div className="feature-grid">
              <article>
                <span className="feature-icon"><Icon name="satellite" size={23} /></span>
                <h3>Live environmental data</h3>
                <p>Combines recent precipitation, temperature and soil moisture observations.</p>
              </article>
              <article>
                <span className="feature-icon"><Icon name="layers" size={23} /></span>
                <h3>Multi-horizon forecast</h3>
                <p>Compares current conditions with outlooks at 7, 15, 30 and 60 days.</p>
              </article>
              <article>
                <span className="feature-icon"><Icon name="chart" size={23} /></span>
                <h3>Visual risk assessment</h3>
                <p>Transforms model outcomes into concise, easy-to-understand risk signals.</p>
              </article>
            </div>
          </section>
        </main>
      ) : (
        <main className="dashboard">
          <div className="dashboard-heading">
            <div>
              <span className="section-kicker">Prediction workspace</span>
              <h1>Risk analysis</h1>
              <p>Assess hydro-meteorological conditions for a study region.</p>
            </div>
            <button className="back-button" onClick={() => setView('landing')}>← Back to overview</button>
          </div>

          <section className="analysis-controls">
            <div className="control-location">
              <label htmlFor="location">Study region</label>
              <div className="select-wrap">
                <Icon name="pin" size={18} />
                <select id="location" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                  {LOCATIONS.map(loc => (
                    <option key={loc.name} value={loc.name}>{loc.region}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="analyze-button" onClick={() => fetchPrediction(false)} disabled={loading}>
              {loading ? <span className="spinner" /> : <Icon name="chart" size={18} />}
              {loading ? 'Analyzing...' : 'Run prediction'}
            </button>
          </section>

          {error && <div className="error-banner"><strong>Analysis could not be completed.</strong><span>{error}</span></div>}

          {!data && !loading && (
            <section className="empty-state">
              <div className="empty-visual"><Icon name="leaf" size={34} /></div>
              <h2>Ready for your analysis</h2>
              <p>Select a region and run a prediction to view live conditions and forecast horizons.</p>
            </section>
          )}

          {loading && (
            <section className="empty-state loading-state">
              <span className="large-spinner" />
              <h2>Processing regional conditions</h2>
              <p>Retrieving live weather observations and generating forecasts...</p>
            </section>
          )}

          {data && (
            <section className="results">
              <div className="result-header">
                <div>
                  <span className="section-kicker">Current assessment</span>
                  <h2>{data.location.replace(/_/g, ' ')}</h2>
                </div>
                <div className="coordinates"><Icon name="pin" size={16} /> {data.latitude}°N, {data.longitude}°E</div>
              </div>

              <div className="metrics-grid">
                <article className="metric-card">
                  <span className="metric-icon blue"><Icon name="rain" size={20} /></span>
                  <div><span>Daily precipitation</span><strong>{data.current_parameters.precipitation}<small> mm</small></strong></div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon cyan"><Icon name="drop" size={20} /></span>
                  <div><span>Root-zone soil moisture</span><strong>{data.current_parameters.soil_moisture}<small> m³/m³</small></strong></div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon orange"><Icon name="temperature" size={20} /></span>
                  <div><span>Mean temperature</span><strong>{data.current_parameters.temperature_mean}<small> °C</small></strong></div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon green"><Icon name="cloud" size={20} /></span>
                  <div><span>7-day rainfall</span><strong>{data.current_parameters.rain_7d_sum}<small> mm</small></strong></div>
                </article>
              </div>

              <div className="insight-grid">
                <article className="panel risk-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">Forecast horizon</span><h3>Risk outlook</h3></div>
                    <RiskBadge level={activePrediction?.level} />
                  </div>
                  <div className="horizon-tabs">
                    {HORIZONS.map(horizon => (
                      <button key={horizon.key} className={activeHorizon === horizon.key ? 'active' : ''} onClick={() => setActiveHorizon(horizon.key)}>
                        {horizon.short}
                      </button>
                    ))}
                  </div>
                  {activePrediction && (
                    <div className={`active-risk-card ${activePrediction.level.toLowerCase().replace(' ', '-')}`}>
                      <div>
                        <span>{HORIZONS.find(h => h.key === activeHorizon)?.label} forecast</span>
                        <h3>{activePrediction.level}</h3>
                        <p>{activePrediction.description}</p>
                      </div>
                      <div className="risk-glyph"><Icon name="drop" size={28} /></div>
                    </div>
                  )}
                </article>

                <article className="panel chart-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">Risk progression</span><h3>Horizon comparison</h3></div>
                  </div>
                  <div className="risk-chart">
                    <div className="chart-ylabels"><span>High</span><span>Moderate</span><span>Low</span></div>
                    <svg viewBox="0 0 560 190" role="img" aria-label="Drought risk across forecast horizons">
                      <line x1="40" y1="45" x2="520" y2="45" /><line x1="40" y1="100" x2="520" y2="100" /><line x1="40" y1="155" x2="520" y2="155" />
                      <polyline className="risk-line" points={riskPoints} />
                      {HORIZONS.map((horizon, index) => {
                        const level = data.predictions[horizon.key]?.level;
                        const y = 155 - (riskValue(level) * 55);
                        const x = 40 + index * 130;
                        return <g key={horizon.key}><circle className={`chart-dot ${level?.toLowerCase().replace(' ', '-')}`} cx={x} cy={y} r="7" /><text x={x} y="184" textAnchor="middle">{horizon.short}</text></g>;
                      })}
                    </svg>
                  </div>
                </article>
              </div>

              <div className="insight-grid lower-grid">
                <article className="panel moisture-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">Environmental indicator</span><h3>Soil moisture</h3></div>
                  </div>
                  <div className="gauge-row">
                    <div className="moisture-gauge" style={{ '--moisture': `${Math.max(0, Math.min(100, data.current_parameters.soil_moisture * 100))}%` }}>
                      <div><strong>{Math.round(data.current_parameters.soil_moisture * 100)}%</strong><span>moisture</span></div>
                    </div>
                    <div className="gauge-copy">
                      <span>Root-zone condition</span>
                      <strong>{data.current_parameters.soil_moisture < 0.35 ? 'Dry conditions' : data.current_parameters.soil_moisture < 0.45 ? 'Low to moderate' : 'Adequate'}</strong>
                      <p>Current root-zone moisture is based on the latest available weather observation.</p>
                    </div>
                  </div>
                </article>

                <article className="panel rainfall-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">Accumulation</span><h3>Rainfall summary</h3></div>
                  </div>
                  <div className="rain-bars">
                    {[
                      { label: '7-day', value: data.current_parameters.rain_7d_sum },
                      { label: '30-day', value: data.current_parameters.rain_30d_sum }
                    ].map(item => (
                      <div className="rain-bar-row" key={item.label}>
                        <div><span>{item.label}</span><strong>{item.value} mm</strong></div>
                        <div className="bar-track"><span style={{ width: `${Math.min(100, item.value / 100 * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
