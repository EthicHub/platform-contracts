'use strict';

var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');



// Rinkeby Lending contract address
var contract_address = "0x3027ee822ce6f511ea5f8805503add7c97ac1b2e";
const loader = require('./contract_loader.js');

var lending;
async function doStuff() {
  var accounts = await web3.eth.getAccounts();
  lending = await loader('Lending',contract_address,web3);
  // set provider for all later instances to use
  const state = await lending.methods.state().call();
  console.log(state);
  const tx = await lending.methods.returnBorroweedEth().send({from: accounts[0] , value: INSERT_VALUE});
  console.log(tx);

}
doStuff();