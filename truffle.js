require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "192.168.99.100",
      port: 8545,
      network_id: "*" // Match any network id
    }
  }
};
