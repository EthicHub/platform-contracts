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
let account = '0x0aa1a23a0d78a2a4f2f8fabfbd711b656f068d32';
let representative = '0x87F751f7ae13F1C6fc1a7f67C550773350a52Cb5';

loader.load(web3, 'EthicHubStorage',storageAddress).then( async (storageInstance) =>  {
    // await storageInstance.methods.setBool(
    //         web3.utils.soliditySha3('user','representative',representative),
    //         true
    //         )
    //         .send({
    //             from:account,
    //             gas: 3000000
    //         });

    var response = await storageInstance.methods.getBool(
            web3.utils.soliditySha3('user','representative',representative))
            .call({from:account});
    console.log(response);
    return '';
});
