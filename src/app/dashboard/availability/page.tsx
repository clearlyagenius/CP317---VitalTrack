"use client";

import { useState, useEffect } from 'react';
import AvailableDoctors from '@/components/AvailableDoctors';

export default function AvailabilityPage() {
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState('Offline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/availability')
      .then((res) => res.json())
      .then((data) => {
        setRole(data.role);
        setStatus(data.status || 'Offline');
        setLoading(false);
      });
  }, []);

  const changeStatus = async (newStatus: string) => {
    setStatus(newStatus); 
    await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  if (loading) return <div className="page-container">Loading...</div>;

  if (role === 'Patient') {
    return (
      <div className="animate-in">
        <h1 style={{ marginBottom: '24px' }}>Chat Availability</h1>
        <AvailableDoctors />
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ marginBottom: '8px' }}>Provider Control Panel</h2>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '32px' }}>
        Set your real-time availability status for connected patients.
      </p>
      
      <div className="chip-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {['Available', 'Busy', 'Offline'].map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            className={`chip ${status === s ? 'chip-active' : ''}`}
            style={{ padding: '16px', fontSize: '1rem', width: '100%', textAlign: 'center' }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="alert alert-success" style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          backgroundColor: status === 'Available' ? 'var(--green-500)' : status === 'Busy' ? '#ef4444' : 'var(--gray-400)'
        }}></div>
        <span style={{ fontSize: '0.9rem' }}>
          Your profile is currently broadcasted as: <strong>{status}</strong>
        </span>
      </div>
    </div>
  );
}
