require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"+process.env.INFURA_KEY));
var cmc;
var storageAddress;

const loader = require('./contract_loader.js');


loader.load(web3, 'EthicHubCMC').then( cmcInstance => {
    cmc = cmcInstance;
    return loader.load(web3, 'EthicHubStorage').then( async (storageInstance) =>  {
        storageAddress = await storageInstance.options.address;
        return web3.eth.getAccounts().then(accounts => {

            const deployable = loader.getDeployable(web3,'EthicHubReputation');
            return deployable.contract.deploy({
              data: deployable.byteCode,
              arguments: [storageAddress]
            })
            .send({
              from: accounts[0],
              gas: 4000000,
              gasPrice: '3000000000000',
            })
            .on('error', function(error){
                console.log("--> Error:")
                console.error(error);
            })
            .on('receipt', function(receipt){
               console.log(receipt) // contains the new contract address
            })
            .on('confirmation', function(confirmationNumber, receipt){
                console.log(`Confirmation number: ${confirmationNumber}`);
            })
            .then(function(newReputationInstance){
                console.log("Deployed");
                console.log(newContractInstance.options.address) // instance with the new contract address

                return cmc.upgradeContract(newContractInstance.options.address,"reputation").then(() => {
                    console.log("Reputation upgraded");
                    return cmc;
                })
            });
        });

    });
})





// loader.getContractWrapper(web3, 'EthicHubReputation').deploy({
//     data: '0x12345...',
//     arguments: [123, 'My String']
// })
// .send({
//     from: '0x1234567890123456789012345678901234567891',
//     gas: 1500000,
//     gasPrice: '30000000000000'
// }, function(error, transactionHash){ ... })
// .on('error', function(error){ ... })
// .on('transactionHash', function(transactionHash){ ... })
// .on('receipt', function(receipt){
//    console.log(receipt.contractAddress) // contains the new contract address
// })
// .on('confirmation', function(confirmationNumber, receipt){ ... })
// .then(function(newContractInstance){
//     console.log(newContractInstance.options.address) // instance with the new contract address
// });
//await cmcInstance.upgradeContract(reputation.address,"reputation");
//var contractInstance = MyContract.new([contructorParam1] [, contructorParam2], { from: myAccount, gas: 1000000});
