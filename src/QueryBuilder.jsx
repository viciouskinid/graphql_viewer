import React, { useState, useEffect } from 'react';

export default function QueryBuilder({ schema, url }) {
  const [selectedQuery, setSelectedQuery] = useState('');
  const [args, setArgs] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [allScalarFields, setAllScalarFields] = useState([]);
  const [showFieldOptions, setShowFieldOptions] = useState(false);
  // For subfield arguments
  const [subfieldArgs, setSubfieldArgs] = useState({}); // { fieldName: { argName: value } }
  // For connection field selection (like transaction fields)
  const [connectionFields, setConnectionFields] = useState({}); // { fieldName: [selectedSubfields] }

  if (!schema) return null;
  const queryType = schema.types.find(t => t.name === schema.queryType.name);
  const queries = queryType && queryType.fields ? queryType.fields : [];

  // Helper to get type definition by name
  const getTypeDef = (type) => {
    let t = type;
    while (t.ofType) t = t.ofType;
    return schema.types.find(st => st.name === t.name);
  };

  // Helper to get field definition by name from a type
  const getFieldDef = (type, fieldName) => {
    const typeDef = getTypeDef(type);
    if (!typeDef || !typeDef.fields) return null;
    return typeDef.fields.find(f => f.name === fieldName);
  };

  // Helper to get available fields for a connection's node type
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
      
      return nodeType.fields.filter(f => {
        let t = f.type;
        while (t && t.ofType) t = t.ofType;
        return t && ['SCALAR', 'ENUM'].includes(t.kind);
      });
    } catch (error) {
      console.error('Error in getConnectionNodeFields:', error);
      return [];
    }
  };

  // Helper to handle connection field selection
  const handleConnectionFieldToggle = (connectionFieldName, subFieldName) => {
    setConnectionFields(prev => {
      const current = prev[connectionFieldName] || [];
      const newFields = current.includes(subFieldName)
        ? current.filter(f => f !== subFieldName)
        : [...current, subFieldName];
      return { ...prev, [connectionFieldName]: newFields };
    });
  };

  // Helper to auto-build the selection set for connection fields
  const buildConnectionSelection = (field, schema) => {
    const fieldName = field.name;
    const selectedSubfields = connectionFields[fieldName] || [];
    
    if (selectedSubfields.length === 0) {
      // Default selection when no subfields are selected
      return `edges {
        node {
          __typename
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }`;
    }

    // Build selection with user-selected fields
    const nodeFields = selectedSubfields.join('\n          ');
    return `edges {
        node {
          ${nodeFields}
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }`;
  };

  // Helper to check if a type is scalar
  const isScalar = (type) => {
    let t = type;
    while (t.kind === 'NON_NULL' || t.kind === 'LIST') t = t.ofType;
    return ['SCALAR', 'ENUM'].includes(t.kind);
  };

  // Helper to get all scalar fields recursively for a type
  const getAllScalarFields = (type) => {
    const typeDef = getTypeDef(type);
    if (!typeDef || !typeDef.fields) return [];
    return typeDef.fields
      .filter(f => isScalar(f.type))
      .map(f => f.name);
  };

  // Helper to get all fields (including objects) for a type
  const getAllFields = (type) => {
    const typeDef = getTypeDef(type);
    if (!typeDef || !typeDef.fields) return [];
    return typeDef.fields.map(f => f.name);
  };

  // When query changes, set default fields to all scalars or, if none, all fields
  useEffect(() => {
    if (!selectedQuery) {
      setSelectedFields([]);
      setAllScalarFields([]);
      return;
    }
    const field = queries.find(q => q.name === selectedQuery);
    if (!field) return;
    let scalars = getAllScalarFields(field.type);
    if (scalars.length === 0) {
      // If no scalars, select all fields (for connection types, etc.)
      scalars = getAllFields(field.type);
    }
    setAllScalarFields(scalars);
    setSelectedFields(scalars);
  }, [selectedQuery]);

  const handleQueryChange = (e) => {
    setSelectedQuery(e.target.value);
    setArgs({});
    setResult(null);
    setError(null);
    setShowFieldOptions(false);
  };

  const handleArgChange = (name, value) => {
    setArgs(prev => ({ ...prev, [name]: value }));
  };

  const handleFieldToggle = (field) => {
    try {
      setSelectedFields(prev => {
        const isAdding = !prev.includes(field);
        if (isAdding) {
          // If adding a connection field, set some default subfields
          const selectedField = queries.find(q => q.name === selectedQuery);
          if (selectedField) {
            const fieldDef = getFieldDef(selectedField.type, field);
            if (fieldDef) {
              const isConnection = field === 'transactions' || (getTypeDef(fieldDef.type)?.fields?.some(ff => ff.name === 'edges'));
              if (isConnection) {
                const nodeFields = getConnectionNodeFields(fieldDef);
                const defaultFields = nodeFields.slice(0, 5).map(f => f.name); // Take first 5 fields as defaults
                setConnectionFields(prevConn => ({
                  ...prevConn,
                  [field]: defaultFields
                }));
              }
            }
          }
          return [...prev, field];
        } else {
          // If removing, also clear connection fields
          setConnectionFields(prevConn => {
            const newConn = { ...prevConn };
            delete newConn[field];
            return newConn;
          });
          return prev.filter(f => f !== field);
        }
      });
    } catch (error) {
      console.error('Error in handleFieldToggle:', error);
    }
  };

  // Helper to build a selection set for a field (recursively for objects/lists)
  const buildSelectionSet = (type, selected) => {
    const typeDef = getTypeDef(type);
    if (!typeDef || !typeDef.fields) return '';
    return selected
      .map(fName => {
        const f = typeDef.fields.find(ff => ff.name === fName);
        if (!f) return '';
        // Recursively handle connection types (fields ending with 'transactions', 'edges', etc.)
        const isConnection = f.name === 'transactions' || (getTypeDef(f.type)?.fields?.some(ff => ff.name === 'edges'));
        if (isConnection) {
          // Add arguments if needed
          let argStr = '';
          if (f.args && f.args.length > 0) {
            const subArgs = subfieldArgs[f.name] || {};
            const argPairs = f.args
              .filter(a => {
                const v = subArgs[a.name];
                return v !== undefined && v !== null && String(v).trim() !== '';
              })
              .map(a => {
                let val = subArgs[a.name];
                if (a.type.kind === 'NON_NULL') val = val;
                if (a.type.name === 'Int' || (a.type.ofType && a.type.ofType.name === 'Int')) val = parseInt(val, 10);
                else if (a.type.name === 'Float' || (a.type.ofType && a.type.ofType.name === 'Float')) val = parseFloat(val);
                else if (a.type.name === 'Boolean' || (a.type.ofType && a.type.ofType.name === 'Boolean')) val = val === 'true' || val === true;
                else if (a.type.name === 'ID' || a.type.name === 'String' || (a.type.ofType && (a.type.ofType.name === 'ID' || a.type.ofType.name === 'String'))) val = JSON.stringify(val);
                else val = JSON.stringify(val);
                return `${a.name}: ${val}`;
              });
            argStr = argPairs.length > 0 ? `(${argPairs.join(', ')})` : '';
          }
          // Always include default selection set for connections, even if user did not select subfields
          const connSel = buildConnectionSelection(f, schema);
          if (!connSel.trim()) {
            // fallback: always include edges { node { __typename } } if nothing else
            return `${f.name}${argStr} { edges { node { __typename } } pageInfo { endCursor hasNextPage } }`;
          }
          return `${f.name}${argStr} {\n      ${connSel}\n    }`;
        }
        if (isScalar(f.type)) return f.name;
        // For objects/lists, check for arguments
        let argStr = '';
        if (f.args && f.args.length > 0) {
          const subArgs = subfieldArgs[f.name] || {};
          const argPairs = f.args
            .filter(a => {
              const v = subArgs[a.name];
              return v !== undefined && v !== null && String(v).trim() !== '';
            })
            .map(a => {
              // Parse value to correct type
              let val = subArgs[a.name];
              if (a.type.kind === 'NON_NULL') val = val;
              if (a.type.name === 'Int' || (a.type.ofType && a.type.ofType.name === 'Int')) val = parseInt(val, 10);
              else if (a.type.name === 'Float' || (a.type.ofType && a.type.ofType.name === 'Float')) val = parseFloat(val);
              else if (a.type.name === 'Boolean' || (a.type.ofType && a.type.ofType.name === 'Boolean')) val = val === 'true' || val === true;
              else if (a.type.name === 'ID' || a.type.name === 'String' || (a.type.ofType && (a.type.ofType.name === 'ID' || a.type.ofType.name === 'String'))) val = JSON.stringify(val);
              else val = JSON.stringify(val);
              return `${a.name}: ${val}`;
            });
          argStr = argPairs.length > 0 ? `(${argPairs.join(', ')})` : '';
        }
        // For subfields, recursively build selection set for selected subfields
        const subTypeDef = getTypeDef(f.type);
        const subFields = subTypeDef && subTypeDef.fields ? subTypeDef.fields.map(sf => sf.name) : [];
        const subSelection = buildSelectionSet(f.type, subFields);
        return `${f.name}${argStr} { ${subSelection} }`;
      })
      .join('\n      ');
  };
  // Handle subfield argument change
  const handleSubfieldArgChange = (fieldName, argName, value) => {
    setSubfieldArgs(prev => ({
      ...prev,
      [fieldName]: {
        ...(prev[fieldName] || {}),
        [argName]: value
      }
    }));
  };

  const buildQuery = () => {
    const field = queries.find(q => q.name === selectedQuery);
    if (!field) return '';
    const argStr = field.args.map(arg => `${arg.name}: $${arg.name}`).join(', ');
    const varDefs = field.args.map(arg => `$${arg.name}: ${renderType(arg.type)}`).join(', ');
    const fieldsStr = selectedFields.length > 0 ? buildSelectionSet(field.type, selectedFields) : '__typename';
    return `query(${varDefs}) {\n  ${selectedQuery}${argStr ? `(${argStr})` : ''} {\n      ${fieldsStr}\n  }\n}`;
  };

  const renderType = (type) => {
    if (type.kind === 'NON_NULL') return renderType(type.ofType) + '!';
    if (type.kind === 'LIST') return `[${renderType(type.ofType)}]`;
    return type.name;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const field = queries.find(q => q.name === selectedQuery);
    if (!field) return;
    const query = buildQuery();
    const variables = {};
    field.args.forEach(arg => {
      variables[arg.name] = args[arg.name] || '';
    });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const field = queries.find(q => q.name === selectedQuery);
  const typeDef = field ? getTypeDef(field.type) : null;
  const allFields = typeDef && typeDef.fields ? typeDef.fields.map(f => f.name) : [];

  return (
    <div style={{marginTop:'2em', padding:'1em', border:'1px solid #ccc', borderRadius:'8px'}}>
      <h2>Query Builder</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Query:
          <select value={selectedQuery} onChange={handleQueryChange} style={{marginLeft:'0.5em'}}>
            <option value="">Select a query</option>
            {queries.map(q => (
              <option key={q.name} value={q.name}>{q.name}</option>
            ))}
          </select>
        </label>
        {selectedQuery && field?.args.length > 0 && (
          <div style={{marginTop:'1em'}}>
            <h4>Arguments</h4>
            {field.args.map(arg => (
              <div key={arg.name} style={{marginBottom:'0.5em'}}>
                <label>
                  {arg.name} ({renderType(arg.type)}):
                  <input
                    type="text"
                    value={args[arg.name] || ''}
                    onChange={e => handleArgChange(arg.name, e.target.value)}
                    style={{marginLeft:'0.5em'}}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
        {selectedQuery && allFields.length > 0 && (
          <div style={{marginTop:'1em'}}>
            <button type="button" onClick={() => setShowFieldOptions(v => !v)} style={{marginBottom:'0.5em'}}>
              {showFieldOptions ? 'Hide' : 'Show'} Field Selection
            </button>
            {showFieldOptions && (
              <div style={{marginBottom:'1em'}}>
                <div><b>Select fields to include:</b></div>
                {allFields.map(f => {
                  const fDef = getFieldDef(field.type, f);
                  return (
                    <div key={f} style={{marginBottom:'0.5em'}}>
                      <label style={{marginRight:'1em'}}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(f)}
                          onChange={() => handleFieldToggle(f)}
                        /> {f}
                      </label>
                      {/* If this field has args, show input(s) when selected */}
                      {fDef && fDef.args && fDef.args.length > 0 && selectedFields.includes(f) && (
                        <span style={{marginLeft:'1em'}}>
                          {fDef.args.map(arg => {
                            // Use defaultValue from schema if present
                            const defaultVal = arg.defaultValue !== undefined && arg.defaultValue !== null ? arg.defaultValue : '';
                            // If the user hasn't typed anything, prefill with default
                            const val = (subfieldArgs[f]?.[arg.name] !== undefined && subfieldArgs[f]?.[arg.name] !== null)
                              ? subfieldArgs[f][arg.name]
                              : defaultVal;
                            return (
                              <label key={arg.name} style={{marginRight:'1em'}}>
                                {arg.name}:
                                <input
                                  type="text"
                                  value={val}
                                  onChange={e => handleSubfieldArgChange(f, arg.name, e.target.value)}
                                  style={{marginLeft:'0.3em', width:'6em'}}
                                  placeholder={arg.type.kind === 'NON_NULL' ? 'required' : ''}
                                />
                              </label>
                            );
                          })}
                        </span>
                      )}
                      
                      {/* Connection field selection (like transactions) */}
                      {selectedFields.includes(f) && fDef && (
                        (() => {
                          try {
                            const isConnection = f === 'transactions' || (getTypeDef(fDef.type)?.fields?.some(ff => ff.name === 'edges'));
                            if (!isConnection) return null;
                            
                            const nodeFields = getConnectionNodeFields(fDef);
                            if (!nodeFields || nodeFields.length === 0) return null;
                            
                            return (
                              <div style={{marginLeft:'2em', marginTop:'0.5em', padding:'0.5em', border:'1px solid #ddd', borderRadius:'4px'}}>
                                <div style={{fontWeight:'bold', marginBottom:'0.5em'}}>Select {f} fields:</div>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.25em'}}>
                                  {nodeFields.map(nodeField => (
                                    <label key={nodeField.name} style={{fontSize:'smaller'}}>
                                      <input
                                        type="checkbox"
                                        checked={(connectionFields[f] || []).includes(nodeField.name)}
                                        onChange={() => handleConnectionFieldToggle(f, nodeField.name)}
                                        style={{marginRight:'0.25em'}}
                                      />
                                      {nodeField.name}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch (error) {
                            console.error('Error rendering connection field selection:', error);
                            return <div style={{color: 'red', fontSize: 'smaller'}}>Error loading {f} fields</div>;
                          }
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <button type="submit" disabled={!selectedQuery || loading} style={{marginTop:'1em'}}>Execute</button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div style={{color:'red'}}>Error: {error}</div>}
      {result && (
        <pre style={{marginTop:'1em', background:'#f6f6f6', color:'#111', padding:'1em', borderRadius:'6px', maxHeight:'300px', overflow:'auto'}}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
