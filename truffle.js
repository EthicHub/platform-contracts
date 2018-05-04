require('babel-register');
require('babel-polyfill');

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 4600000,
      network_id: "*" // Match any network id
    },
    ganache: {
        host: "127.0.0.1",
        port: 9545,
        gas: 4600000,
        network_id: "*" // Match any network id
    }

  }
};
