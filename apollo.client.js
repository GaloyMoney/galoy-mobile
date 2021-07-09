module.exports = {
  client: {
    includes: ["app/**/*.{ts,tsx,js,jsx,graphql}"],
    service: {
      name: 'galoy',
      url: 'http://localhost:4000/graphql',
    }
  },
};
