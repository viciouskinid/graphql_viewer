
import { useEffect, useState } from 'react';
import QueryBuilder from './QueryBuilder';

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
const DEFAULT_GRAPHQL_URL = PRESET_URLS[0].url;
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
        }
      }
    }
  }
`;


function App() {
  const [url, setUrl] = useState(DEFAULT_GRAPHQL_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_GRAPHQL_URL);
  const [dropdownValue, setDropdownValue] = useState(DEFAULT_GRAPHQL_URL);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSchema(null);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.errors) {
          setError(data.errors.map(e => e.message).join(', '));
        } else {
          setSchema(data.data.__schema);
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [url]);

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
    setUrl(inputUrl);
  };

  if (loading) return <div>Loading GraphQL schema...</div>;
  if (error) return <div style={{color:'red'}}>Error: {error}</div>;
  if (!schema) return <div>No schema found.</div>;

  const renderFields = (fields) => (
    <ul>
      {fields.map(field => (
        <li key={field.name} style={{marginBottom: '0.5em'}}>
          <b>{field.name}</b>
          {field.args && field.args.length > 0 && (
            <div style={{fontSize:'smaller', marginLeft:'1em'}}>
              <strong>Arguments:</strong>
              <ul style={{margin:'0.5em 0'}}>
                {field.args.map(arg => (
                  <li key={arg.name}>
                    {arg.name}: {renderType(arg.type)}
                    {arg.description && <span style={{color:'#666'}}> - {arg.description}</span>}
                    {arg.defaultValue !== undefined && <span style={{color:'#888'}}> (default: {JSON.stringify(arg.defaultValue)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {field.type && (
            <div style={{fontSize:'smaller', marginLeft:'1em', color:'#555'}}>
              <strong>Returns:</strong> {renderType(field.type)}
            </div>
          )}
          {field.description && <div style={{fontSize:'smaller', marginLeft:'1em', color:'#666'}}>{field.description}</div>}
        </li>
      ))}
    </ul>
  );

  const renderType = (type) => {
    if (type.kind === 'NON_NULL') return renderType(type.ofType) + '!';
    if (type.kind === 'LIST') return `[${renderType(type.ofType)}]`;
    return type.name;
  };

  const queryType = schema.types.find(t => t.name === schema.queryType.name);
  const mutationType = schema.mutationType && schema.types.find(t => t.name === schema.mutationType.name);

  return (
    <div style={{padding:'2rem', fontFamily:'sans-serif'}}>
      <h1>GraphQL API Explorer</h1>
      <form onSubmit={handleUrlSubmit} style={{marginBottom:'1rem'}}>
        <label>
          GraphQL Endpoint:
          <select
            value={dropdownValue === 'custom' ? 'custom' : inputUrl}
            onChange={handleDropdownChange}
            style={{marginLeft:'0.5rem'}}
          >
            {PRESET_URLS.map(opt => (
              <option key={opt.url} value={opt.url}>{opt.label}</option>
            ))}
            <option value="custom">Custom...</option>
          </select>
        </label>
        <input
          type="text"
          value={inputUrl}
          onChange={handleUrlChange}
          style={{marginLeft:'0.5rem', width:'32em'}}
          placeholder="Enter GraphQL endpoint URL"
        />
        <button type="submit" style={{marginLeft:'1em'}}>Load</button>
      </form>
      <div><b>Endpoint:</b> <code>{url}</code></div>
      
      <h2>Available Queries</h2>
      {queryType && queryType.fields ? renderFields(queryType.fields) : <div>No queries found.</div>}
      
      <h2>Available Mutations</h2>
      {mutationType && mutationType.fields ? renderFields(mutationType.fields) : <div>No mutations found.</div>}
      
      <h2>All Schema Types & Fields</h2>
      <div style={{maxHeight: '500px', overflowY: 'auto', border: '1px solid #ccc', padding: '1em', marginBottom: '1em'}}>
        {schema.types
          .filter(type => !type.name.startsWith('__')) // Filter out introspection types
          .map(type => (
            <div key={type.name} style={{marginBottom: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '1em'}}>
              <h4 style={{margin: '0 0 0.5em 0', color: '#333'}}>
                {type.kind} <span style={{color: '#0066cc'}}>{type.name}</span>
              </h4>
              {type.description && <p style={{fontSize: 'smaller', color: '#666', margin: '0 0 0.5em 0'}}>{type.description}</p>}
              
              {type.fields && type.fields.length > 0 && (
                <div style={{marginLeft: '1em'}}>
                  <strong>Fields:</strong>
                  {renderFields(type.fields)}
                </div>
              )}
              
              {type.enumValues && type.enumValues.length > 0 && (
                <div style={{marginLeft: '1em'}}>
                  <strong>Enum Values:</strong>
                  <ul>
                    {type.enumValues.map(value => (
                      <li key={value.name} style={{marginBottom: '0.25em'}}>
                        <code>{value.name}</code>
                        {value.description && <span style={{color: '#666'}}> - {value.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {type.inputFields && type.inputFields.length > 0 && (
                <div style={{marginLeft: '1em'}}>
                  <strong>Input Fields:</strong>
                  {renderFields(type.inputFields)}
                </div>
              )}
            </div>
          ))}
      </div>
      <p style={{marginTop:'2rem', fontSize:'smaller', color:'#888'}}>This UI uses GraphQL introspection to show what can be done with the API.</p>
      <QueryBuilder schema={schema} url={url} />
    </div>
  );
}

export default App;
