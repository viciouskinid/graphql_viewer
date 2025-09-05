# GraphQL API Explorer

A powerful React-based GraphQL API explorer and query builder that allows you to introspect GraphQL schemas and build complex queries with an intuitive interface.

## 🚀 Live Demo

Visit the live application: [https://viciouskinid.github.io/graphql_viewer/](https://viciouskinid.github.io/graphql_viewer/)

## ✨ Features

- **Schema Introspection**: Automatically discover and display available queries, mutations, and all schema types
- **Interactive Query Builder**: Build GraphQL queries with a user-friendly interface
- **Field Selection**: Choose specific fields to include in your queries
- **Connection Field Support**: Advanced support for GraphQL connection patterns (like transactions)
- **Transaction Field Selection**: When querying transactions, select specific fields like hash, from, to, value, etc.
- **Argument Input**: Provide arguments for queries and fields with type validation
- **Multiple API Support**: Pre-configured with several GraphQL endpoints including PulseChain APIs
- **Real-time Execution**: Execute queries and view results in real-time
- **Error Handling**: Comprehensive error handling with meaningful error messages

## 🛠️ Built With

- React 18
- Vite
- GraphQL Introspection
- JavaScript ES6+

## 🔧 Default APIs

The application comes pre-configured with several GraphQL endpoints:

- **PulseChain Scan API**: `https://api.scan.pulsechain.com/api/v1/graphql`
- **PulseChain Gateway**: `https://api-gateway.pulsechain.com/api/v1/graphql`
- **PulseChain Beacon**: `https://beacon.pulsechain.com/api/v1/graphql`
- **PulseChain Validator**: `https://validator.pulsechain.com/api/v1/graphql`

You can also add custom GraphQL endpoints.

## 🚀 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/viciouskinid/graphql_viewer.git
   cd graphql_viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 📖 How to Use

1. **Select an API**: Choose from the dropdown or enter a custom GraphQL endpoint
2. **Load Schema**: Click "Load" to introspect the GraphQL schema
3. **Browse Schema**: View all available queries, mutations, and types in the schema
4. **Build Queries**: 
   - Select a query from the Query Builder
   - Fill in required arguments
   - Choose which fields to include
   - For connection fields (like transactions), select specific subfields
5. **Execute**: Click "Execute" to run your query and view results

## 🔍 Advanced Features

### Transaction Field Selection
When working with blockchain APIs, you can:
- Select the "transactions" field
- Choose specific transaction fields like:
  - `hash` - Transaction hash
  - `from` - Sender address
  - `to` - Recipient address
  - `value` - Transaction value
  - `blockNumber` - Block number
  - `gasUsed` - Gas consumed
  - And many more...

### Schema Explorer
The application provides a comprehensive view of the entire GraphQL schema, including:
- All available types (Object, Scalar, Enum, etc.)
- Field definitions with types and descriptions
- Argument specifications
- Enum values

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with GraphQL introspection capabilities
- Designed for blockchain API exploration
- Optimized for PulseChain ecosystem APIs+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
