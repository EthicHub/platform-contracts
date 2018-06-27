require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://mainnet.infura.io/"+process.env.INFURA_KEY));
var BN = web3.utils.BN;
const loader = require('./contract_loader.js');
let userAddress = '0xEdD8950B7AcD7717ECc07A94dF126BF2A07f74C4';
let account = '0xAB42A5a21566C9f1466D414CD3195dA44643390b';


if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " <role> <address>");
    process.exit(-1);
}

var role = process.argv[2];
var address = process.argv[3];

console.log("role: "+role)
console.log("address: "+address)


loader.load(web3, 'EthicHubUser',userAddress).then( async (userInstance) =>  {

    var action = userInstance.methods.viewRegistrationStatus(address, role)


    var response = await action.call({from:account});
    console.log(response);

    return '';

});
