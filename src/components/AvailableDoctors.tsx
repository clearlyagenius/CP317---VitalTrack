"use client";

import { useState, useEffect } from 'react';

export default function AvailableDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    const fetchDoctorStatuses = () => {
      fetch('/api/availability?all=true')
        .then((res) => res.json())
        .then((data) => {
          if (data.doctors) setDoctors(data.doctors);
        });
    };

    fetchDoctorStatuses();
    const pollInterval = setInterval(fetchDoctorStatuses, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Healthcare Professionals</h2>
      
      {doctors.length === 0 ? (
        <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>No healthcare professionals available.</p>
      ) : (
        <div className="report-list" style={{ marginTop: 0 }}>
          {doctors.map((doc) => (
            <div key={doc.id} className="report-item animate-in">
              <div className="report-info">
                <div className="report-name">Dr. {doc.firstName} {doc.lastName}</div>
                <div className="report-meta">Contact: {doc.email}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: doc.availabilityStatus === 'Available' ? 'var(--green-500)' : doc.availabilityStatus === 'Busy' ? '#ef4444' : 'var(--gray-400)'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', width: '60px' }}>
                    {doc.availabilityStatus}
                  </span>
                </div>
                
                <button 
                  className="btn-primary" 
                  disabled={doc.availabilityStatus !== 'Available'}
                  style={{ padding: '8px 16px', width: 'auto', fontSize: '0.875rem' }}
                >
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}