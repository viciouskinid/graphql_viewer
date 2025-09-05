import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import QueryDetail from './components/QueryDetail';

const DEFAULT_GRAPHQL_URL = 'https://api.scan.pulsechain.com/api/v1/graphql';

// Mock schema for testing if the real API fails
const MOCK_SCHEMA = {
  types: [
    {
      name: 'Query',
      kind: 'OBJECT',
      fields: [
        {
          name: 'blocks',
          type: { name: 'Block', kind: 'OBJECT' },
          args: [
            { name: 'limit', type: { name: 'Int', kind: 'SCALAR' } },
            { name: 'offset', type: { name: 'Int', kind: 'SCALAR' } }
          ],
          description: 'Get blockchain blocks'
        },
        {
          name: 'transactions',
          type: { name: 'Transaction', kind: 'OBJECT' },
          args: [
            { name: 'hash', type: { name: 'String', kind: 'SCALAR' } },
            { name: 'limit', type: { name: 'Int', kind: 'SCALAR' } }
          ],
          description: 'Get blockchain transactions'
        },
        {
          name: 'address',
          type: { name: 'Address', kind: 'OBJECT' },
          args: [
            { name: 'hash', type: { name: 'String', kind: 'SCALAR' } }
          ],
          description: 'Get address information'
        }
      ]
    },
    {
      name: 'Block',
      kind: 'OBJECT',
      fields: [
        { name: 'hash', type: { name: 'String', kind: 'SCALAR' } },
        { name: 'number', type: { name: 'Int', kind: 'SCALAR' } },
        { name: 'timestamp', type: { name: 'String', kind: 'SCALAR' } }
      ]
    },
    {
      name: 'Transaction',
      kind: 'OBJECT',
      fields: [
        { name: 'hash', type: { name: 'String', kind: 'SCALAR' } },
        { name: 'value', type: { name: 'String', kind: 'SCALAR' } },
        { name: 'gas', type: { name: 'String', kind: 'SCALAR' } }
      ]
    },
    {
      name: 'Address',
      kind: 'OBJECT',
      fields: [
        { name: 'hash', type: { name: 'String', kind: 'SCALAR' } },
        { name: 'balance', type: { name: 'String', kind: 'SCALAR' } }
      ]
    }
  ],
  queryType: { name: 'Query' },
  mutationType: null
};

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }
  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

function App() {
  const [url, setUrl] = useState(DEFAULT_GRAPHQL_URL);
  const [schema, setSchema] = useState(MOCK_SCHEMA); // Start with mock schema immediately
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false for testing

  useEffect(() => {
    // Comment out for testing - loadSchema(url);
    console.log('App mounted, schema:', schema);
  }, [url]);

  const loadSchema = async (graphqlUrl) => {
    setLoading(true);
    setError(null);
    setSchema(null);
    
    console.log('Loading schema from:', graphqlUrl);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: INTROSPECTION_QUERY }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.errors) {
        throw new Error(data.errors.map(e => e.message).join(', '));
      } else {
        setSchema(data.data.__schema);
        console.log('Schema loaded successfully');
      }
    } catch (err) {
      console.error('Error loading schema:', err);
      
      // Use mock schema for testing if real API fails
      console.log('Using mock schema for testing');
      setSchema(MOCK_SCHEMA);
      setError(`Could not load from ${graphqlUrl}. Using mock data for testing. Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <div>Loading GraphQL schema...</div>
        </div>
      </div>
    );
  }

  if (error && !schema) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#e74c3c',
          maxWidth: '500px',
          padding: '2rem'
        }}>
          <h2>Error Loading Schema</h2>
          <p>{error}</p>
          <button 
            onClick={() => loadSchema(url)}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log('=== APP COMPONENT DEBUG ===');
  console.log('App rendering with schema:', schema);
  console.log('loading:', loading);
  console.log('error:', error);

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>GraphQL API Explorer</h1>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            <strong>Endpoint:</strong> {url}
          </div>
        </div>
      </header>
      
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* DEBUG INFO */}
        <div style={{ backgroundColor: '#f0f0f0', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <h4>Debug Info:</h4>
          <p>Schema: {schema ? 'LOADED' : 'NULL'}</p>
          <p>Loading: {loading ? 'YES' : 'NO'}</p>
          <p>Error: {error || 'NONE'}</p>
          <p>Schema Type: {typeof schema}</p>
          <p>Schema Keys: {schema ? Object.keys(schema).join(', ') : 'N/A'}</p>
        </div>
        
        <div style={{ backgroundColor: '#e8f4f8', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <h4>Direct Render Test: Rendering Home Component</h4>
        </div>
        
        <Home 
          schema={schema} 
          url={url} 
          onUrlChange={handleUrlChange} 
        />
      </main>
    </div>
  );
}

export default App;
