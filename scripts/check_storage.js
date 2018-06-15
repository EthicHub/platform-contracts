require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"+process.env.INFURA_KEY));
var BN = web3.utils.BN;
const loader = require('./contract_loader.js');
let cmcAddress = '0x00babec3dc2acc452353949b131854b6f50ef32b';
let userAddress = '0xa7441f5bd97b091a7ffc0611dac3811575c6fb70';
let storageAddress = '0x5ae98649601190a1d6cbb319e6bf218b8ef262d5';

loader.load(web3, 'EthicHubStorage',storageAddress).then( async (storageInstance) =>  {
    
}
