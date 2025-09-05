import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_KEY = "6e5a42115933f5525cca679e3a73373a";
const PRESET_URLS = [
  {
    label: 'PulseChain Scan',
    url: 'https://api.scan.pulsechain.com/api/v1/graphql',
  },
  {
    label: 'The Graph Gateway (API_KEY)', 
    url: `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`,
  },
];

export default function Home({ schema, url, onUrlChange }) {
  console.log('=== HOME COMPONENT DEBUG ===');
  console.log('schema:', schema);
  console.log('url:', url);
  console.log('schema truthy:', !!schema);
  
  const [inputUrl, setInputUrl] = useState(url);
  const [dropdownValue, setDropdownValue] = useState(url);

  console.log('Home component rendered with schema:', schema);
  console.log('Schema type:', typeof schema);

  const handleDropdownChange = (e) => {
    const selected = e.target.value;
    setDropdownValue(selected);
    setInputUrl(selected);
  };

  const handleUrlChange = (e) => {
    setInputUrl(e.target.value);
    setDropdownValue('custom');
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    onUrlChange(inputUrl);
  };

  if (!schema) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Welcome to GraphQL API Explorer</h2>
        <p>Configure your GraphQL endpoint to get started</p>
        
        <form onSubmit={handleUrlSubmit} style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              GraphQL Endpoint:
            </label>
            <select
              value={dropdownValue === 'custom' ? 'custom' : inputUrl}
              onChange={handleDropdownChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              {PRESET_URLS.map(opt => (
                <option key={opt.url} value={opt.url}>{opt.label}</option>
              ))}
              <option value="custom">Custom...</option>
            </select>
            <input
              type="text"
              value={inputUrl}
              onChange={handleUrlChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="Enter GraphQL endpoint URL"
            />
          </div>
          <button 
            type="submit" 
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Load Schema
          </button>
        </form>
      </div>
    );
  }

  const queryType = schema.types.find(t => t.name === schema.queryType.name);
  const queries = queryType && queryType.fields ? queryType.fields : [];
  const mutationType = schema.mutationType && schema.types.find(t => t.name === schema.mutationType.name);
  const mutations = mutationType && mutationType.fields ? mutationType.fields : [];

  const renderType = (type) => {
    if (type.kind === 'NON_NULL') return renderType(type.ofType) + '!';
    if (type.kind === 'LIST') return `[${renderType(type.ofType)}]`;
    return type.name;
  };

  const QueryCard = ({ query, type = 'query' }) => (
    <Link 
      to={`/${type}/${query.name}`}
      style={{ 
        textDecoration: 'none', 
        color: 'inherit'
      }}
    >
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>{query.name}</h3>
        {query.description && (
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
            {query.description}
          </p>
        )}
        
        {query.args && query.args.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Arguments:</strong>
            <div style={{ marginTop: '0.25rem' }}>
              {query.args.slice(0, 3).map(arg => (
                <span 
                  key={arg.name}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#ecf0f1',
                    padding: '0.2rem 0.5rem',
                    margin: '0.2rem 0.2rem 0 0',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    color: '#34495e'
                  }}
                >
                  {arg.name}: {renderType(arg.type)}
                </span>
              ))}
              {query.args.length > 3 && (
                <span style={{ fontSize: '0.75rem', color: '#95a5a6' }}>
                  +{query.args.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        <div style={{ fontSize: '0.85rem', color: '#27ae60' }}>
          <strong>Returns:</strong> {renderType(query.type)}
        </div>
      </div>
    </Link>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>Available Operations</h2>
        <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={dropdownValue === 'custom' ? 'custom' : inputUrl}
            onChange={handleDropdownChange}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {PRESET_URLS.map(opt => (
              <option key={opt.url} value={opt.url}>{opt.label}</option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          <input
            type="text"
            value={inputUrl}
            onChange={handleUrlChange}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', width: '300px' }}
            placeholder="Enter GraphQL endpoint URL"
          />
          <button 
            type="submit"
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </form>
      </div>

      {queries.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '0.5rem' }}>
            Queries ({queries.length})
          </h3>
          <div style={{ marginTop: '1rem' }}>
            {queries.map(query => (
              <QueryCard key={query.name} query={query} type="query" />
            ))}
          </div>
        </section>
      )}

      {mutations.length > 0 && (
        <section>
          <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #e74c3c', paddingBottom: '0.5rem' }}>
            Mutations ({mutations.length})
          </h3>
          <div style={{ marginTop: '1rem' }}>
            {mutations.map(mutation => (
              <QueryCard key={mutation.name} query={mutation} type="mutation" />
            ))}
          </div>
        </section>
      )}

      {queries.length === 0 && mutations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <h3>No operations found</h3>
          <p>This GraphQL schema doesn't expose any queries or mutations.</p>
        </div>
      )}
    </div>
  );
}
