import React from 'react';
import { Link } from 'react-router-dom';

export default function Layout({ children, url, onUrlChange }) {
  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>GraphQL API Explorer</h1>
          </Link>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            <strong>Endpoint:</strong> {url}
          </div>
        </div>
      </header>
      
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
