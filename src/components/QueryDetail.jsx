import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function QueryDetail({ schema, url }) {
  const { type, queryName } = useParams();
  const [selectedFields, setSelectedFields] = useState([]);
  const [args, setArgs] = useState({});
  const [connectionFields, setConnectionFields] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!schema) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Schema not loaded</h2>
        <Link to="/">← Back to Home</Link>
      </div>
    );
  }

  const queryType = type === 'mutation' 
    ? schema.types.find(t => t.name === schema.mutationType?.name)
    : schema.types.find(t => t.name === schema.queryType.name);
  
  const operation = queryType?.fields?.find(q => q.name === queryName);

  if (!operation) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Operation not found</h2>
        <Link to="/">← Back to Home</Link>
      </div>
    );
  }

  // Helper functions
  const getTypeDef = (type) => {
    let t = type;
    while (t.ofType) t = t.ofType;
    return schema.types.find(st => st.name === t.name);
  };

  const renderType = (type) => {
    if (type.kind === 'NON_NULL') return renderType(type.ofType) + '!';
    if (type.kind === 'LIST') return `[${renderType(type.ofType)}]`;
    return type.name;
  };

  const isScalar = (type) => {
    let t = type;
    while (t.kind === 'NON_NULL' || t.kind === 'LIST') t = t.ofType;
    return ['SCALAR', 'ENUM'].includes(t.kind);
  };

  const getAvailableFields = (type) => {
    const typeDef = getTypeDef(type);
    if (!typeDef || !typeDef.fields) return [];
    return typeDef.fields;
  };

  const isConnectionField = (field) => {
    const fieldType = getTypeDef(field.type);
    return fieldType?.fields?.some(f => f.name === 'edges' || f.name === 'nodes');
  };

  const getConnectionNodeFields = (field) => {
    try {
      const fieldType = getTypeDef(field.type);
      if (!fieldType || !fieldType.fields) return [];
      
      const edgesField = fieldType.fields.find(f => f.name === 'edges');
      if (!edgesField) return [];
      
      const edgesType = getTypeDef(edgesField.type);
      if (!edgesType || !edgesType.fields) return [];
      
      const nodeField = edgesType.fields.find(f => f.name === 'node');
      if (!nodeField) return [];
      
      const nodeType = getTypeDef(nodeField.type);
      if (!nodeType || !nodeType.fields) return [];
      
      return nodeType.fields.filter(f => isScalar(f.type));
    } catch (error) {
      console.error('Error getting connection node fields:', error);
      return [];
    }
  };

  const handleFieldToggle = (fieldName) => {
    setSelectedFields(prev => {
      const isAdding = !prev.includes(fieldName);
      if (isAdding) {
        return [...prev, fieldName];
      } else {
        // Remove connection fields when main field is removed
        setConnectionFields(prevConn => {
          const newConn = { ...prevConn };
          delete newConn[fieldName];
          return newConn;
        });
        return prev.filter(f => f !== fieldName);
      }
    });
  };

  const handleConnectionFieldToggle = (connectionFieldName, subFieldName) => {
    setConnectionFields(prev => {
      const current = prev[connectionFieldName] || [];
      const newFields = current.includes(subFieldName)
        ? current.filter(f => f !== subFieldName)
        : [...current, subFieldName];
      return { ...prev, [connectionFieldName]: newFields };
    });
  };

  const handleArgChange = (argName, value) => {
    setArgs(prev => ({ ...prev, [argName]: value }));
  };

  const buildSelectionSet = (fields) => {
    return fields.map(fieldName => {
      const field = getAvailableFields(operation.type).find(f => f.name === fieldName);
      if (!field) return fieldName;

      if (isConnectionField(field)) {
        const subFields = connectionFields[fieldName] || [];
        if (subFields.length === 0) {
          return `${fieldName} { edges { node { __typename } } pageInfo { endCursor hasNextPage } }`;
        }
        const nodeSelection = subFields.join('\n          ');
        return `${fieldName} {
        edges {
          node {
            ${nodeSelection}
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }`;
      } else if (!isScalar(field.type)) {
        // For object types, include scalar fields
        const subFields = getAvailableFields(field.type)
          .filter(f => isScalar(f.type))
          .slice(0, 5)
          .map(f => f.name)
          .join('\n        ');
        return subFields ? `${fieldName} {\n        ${subFields}\n      }` : fieldName;
      }
      
      return fieldName;
    }).join('\n    ');
  };

  const buildQuery = () => {
    if (selectedFields.length === 0) return '';
    
    const argStrings = operation.args
      .filter(arg => args[arg.name] !== undefined && args[arg.name] !== '')
      .map(arg => {
        let value = args[arg.name];
        // Type coercion based on argument type
        const argType = arg.type.kind === 'NON_NULL' ? arg.type.ofType : arg.type;
        if (argType.name === 'Int') value = parseInt(value, 10);
        else if (argType.name === 'Float') value = parseFloat(value);
        else if (argType.name === 'Boolean') value = value === 'true';
        else value = JSON.stringify(value);
        return `${arg.name}: ${value}`;
      });
    
    const argStr = argStrings.length > 0 ? `(${argStrings.join(', ')})` : '';
    const selectionSet = buildSelectionSet(selectedFields);
    
    return `${type} {
  ${queryName}${argStr} {
    ${selectionSet}
  }
}`;
  };

  const executeQuery = async () => {
    const query = buildQuery();
    if (!query.trim()) {
      setError('Please select at least one field');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (data.errors) {
        setError(data.errors.map(e => e.message).join(', '));
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableFields = getAvailableFields(operation.type);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>
          ← Back to Operations
        </Link>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '0.5rem' }}>{operation.name}</h1>
        <div style={{ 
          display: 'inline-block',
          backgroundColor: type === 'mutation' ? '#e74c3c' : '#3498db',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {type}
        </div>
        {operation.description && (
          <p style={{ color: '#666', marginTop: '1rem' }}>{operation.description}</p>
        )}
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#27ae60' }}>
          <strong>Returns:</strong> {renderType(operation.type)}
        </div>
      </div>

      {/* Arguments Section */}
      {operation.args && operation.args.length > 0 && (
        <section style={{ 
          backgroundColor: 'white', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Arguments</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {operation.args.map(arg => (
              <div key={arg.name}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {arg.name}
                  <span style={{ color: '#666', fontWeight: 'normal' }}> ({renderType(arg.type)})</span>
                  {arg.type.kind === 'NON_NULL' && <span style={{ color: '#e74c3c' }}> *</span>}
                </label>
                {arg.description && (
                  <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                    {arg.description}
                  </p>
                )}
                <input
                  type="text"
                  value={args[arg.name] || ''}
                  onChange={(e) => handleArgChange(arg.name, e.target.value)}
                  placeholder={arg.type.kind === 'NON_NULL' ? 'Required' : 'Optional'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fields Selection */}
      <section style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Select Fields to Query</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {availableFields.map(field => (
            <div key={field.name} style={{ 
              border: '1px solid #eee', 
              borderRadius: '6px', 
              padding: '1rem',
              backgroundColor: selectedFields.includes(field.name) ? '#f8f9fa' : 'white'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.name)}
                  onChange={() => handleFieldToggle(field.name)}
                  style={{ marginRight: '0.75rem', transform: 'scale(1.2)' }}
                />
                <div>
                  <strong style={{ color: '#2c3e50' }}>{field.name}</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                    : {renderType(field.type)}
                  </span>
                  {field.description && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      {field.description}
                    </div>
                  )}
                </div>
              </label>

              {/* Connection Field Selection */}
              {selectedFields.includes(field.name) && isConnectionField(field) && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#f1f2f6', 
                  borderRadius: '4px' 
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>
                    Select {field.name} fields:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {getConnectionNodeFields(field).map(nodeField => (
                      <label key={nodeField.name} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(connectionFields[field.name] || []).includes(nodeField.name)}
                          onChange={() => handleConnectionFieldToggle(field.name, nodeField.name)}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span style={{ fontSize: '0.9rem' }}>{nodeField.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Query Preview and Execute */}
      <section style={{ 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#2c3e50', margin: 0 }}>Query Preview</h3>
          <button
            onClick={executeQuery}
            disabled={selectedFields.length === 0 || loading}
            style={{
              backgroundColor: selectedFields.length === 0 ? '#95a5a6' : '#27ae60',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: selectedFields.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
        
        <pre style={{
          backgroundColor: '#2c3e50',
          color: '#ecf0f1',
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.9rem',
          lineHeight: '1.4'
        }}>
          {buildQuery() || 'Select fields to see query preview...'}
        </pre>
      </section>

      {/* Results */}
      {(result || error) && (
        <section style={{ 
          backgroundColor: 'white', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Results</h3>
          {error && (
            <div style={{ 
              backgroundColor: '#fee', 
              border: '1px solid #fcc', 
              color: '#c33', 
              padding: '1rem', 
              borderRadius: '4px' 
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          {result && (
            <pre style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '500px',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
