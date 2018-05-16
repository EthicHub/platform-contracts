require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");

//let mnemonic = process.env.MNEMONIC;


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
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"+process.env.INFURA_KEY);
      },
      network_id: '*',
      gasLimit: 6000000,
      gas: 4700000
    }

  }
};
