'use client';

import { useEffect, useState } from 'react';

interface StatusComponent {
  id: string;
  name: string;
  group_name?: string;
  current_status: 'operational' | 'partial_outage' | 'degraded_performance' | 'full_outage';
}

interface OngoingIncident {
  id: string;
  name: string;
  status: string;
  current_worst_impact: string;
  affected_components: StatusComponent[];
  url: string;
  last_update_at: string;
}

interface StatusData {
  page_title: string;
  page_url: string;
  ongoing_incidents: OngoingIncident[];
  components?: StatusComponent[];
}

export function StatusWidget() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://status.doubleword.ai/api/v1/summary')
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="status-widget loading">
        <p>Loading system status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-widget error">
        <p>Unable to load status. <a href="https://status.doubleword.ai/" target="_blank" rel="noopener noreferrer">View status page →</a></p>
      </div>
    );
  }

  const hasIncidents = status?.ongoing_incidents && status.ongoing_incidents.length > 0;

  return (
    <div className="status-widget">
      <div className={`status-header ${hasIncidents ? 'has-incidents' : 'operational'}`}>
        <div className="status-indicator">
          {hasIncidents ? (
            <>
              <span className="status-dot warning"></span>
              <strong>Experiencing Issues</strong>
            </>
          ) : (
            <>
              <span className="status-dot success"></span>
              <strong>All Systems Operational</strong>
            </>
          )}
        </div>
        <a href={status?.page_url} target="_blank" rel="noopener noreferrer" className="view-details">
          View full status page →
        </a>
      </div>

      {hasIncidents && (
        <div className="ongoing-incidents">
          <h4>Current Incidents</h4>
          {status.ongoing_incidents.map(incident => (
            <div key={incident.id} className="incident">
              <div className="incident-header">
                <h5>{incident.name}</h5>
                <span className={`incident-status ${incident.current_worst_impact.replace('_', '-')}`}>
                  {incident.current_worst_impact.replace('_', ' ')}
                </span>
              </div>
              {incident.affected_components.length > 0 && (
                <p className="affected-components">
                  Affected: {incident.affected_components.map(c => c.name).join(', ')}
                </p>
              )}
              <a href={incident.url} target="_blank" rel="noopener noreferrer">
                View incident details →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}