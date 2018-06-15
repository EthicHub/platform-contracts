require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"+process.env.INFURA_KEY));
var BN = web3.utils.BN;

function latestTime() {
  return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
};
function ether(n) {
  return web3.utils.toWei(n, 'ether');
}

function now() {
  return Math.round((new Date()).getTime() / 1000);
}

var cmc;
var userManager;
const loader = require('./contract_loader.js');
let cmcAddress = '0x00babec3dc2acc452353949b131854b6f50ef32b';
let userAddress = '0xa7441f5bd97b091a7ffc0611dac3811575c6fb70';
let storageAddress = '0x5ae98649601190a1d6cbb319e6bf218b8ef262d5';
let localNode = '0x22B81a6ba76eE53adE0b918C20b4E4c23e3ad473';
let representative = '0x87F751f7ae13F1C6fc1a7f67C550773350a52Cb5';
let community = '0x9441a32D2CFA0Cff7c5374D46Fd1B391Fab44146';
let team = '0xdFb6994ADD952486d2B65af4A6c9D511b122f172';


loader.load(web3, 'EthicHubCMC', cmcAddress).then( cmcInstance => {
    cmc = cmcInstance;
    console.log("got cmc");
    return loader.load(web3, 'EthicHubStorage',storageAddress).then( async (storageInstance) =>  {
        console.log("got storage");
        return web3.eth.getAccounts().then(accounts => {

            console.log("got accounts");
            return loader.load(web3, 'EthicHubUser', userAddress).then( async (userInstance) => {
                console.log("got users");
                var userManager = userInstance;
                var tx = await userManager.methods.registerLocalNode(localNode).send({from:accounts[0],gas: 4000000});
                console.log("Registered localNode");
                console.log(tx);
                tx = await userManager.methods.registerRepresentative(accounts[2]).send({from:accounts[0],gas: 4000000});
                console.log(tx);
                console.log("registerRepresentative");

                tx = await userManager.methods.registerCommunity(community).send({from:accounts[0],gas: 4000000});
                console.log(tx);
                console.log("Registered userManager");

                const fundingStartTime = now() + duration.minutes(15);
                const fundingEndTime = now() + duration.hours(5);
                console.log(fundingStartTime);
                console.log(fundingEndTime);

                console.log(ether('1'));
                const deployable = loader.getDeployable(web3,'EthicHubLending');
                const lendingInstance = await deployable.contract.deploy({
                    data: deployable.byteCode,
                    arguments: [
                        `${fundingStartTime}`,//_fundingStartTime
                        `${fundingEndTime}`,//_fundingEndTime
                        accounts[2],//_borrower
                        '15',//_annualInterest
                        ether('1'),//_totalLendingAmount
                        '2',//_lendingDays
                        storageAddress, //_storageAddress
                        localNode,//localNode
                        team
                    ]
                })
                .send({
                  from: accounts[0],
                  gas: 4500000,
                  gasPrice: '300000000000',
                });

                console.log("Deployed");
                console.log(lendingInstance.options.address) // instance with the new contract address
                await cmc.methods.addNewLendingContract(lendingInstance.options.address).send({from:accounts[0],gas: 4000000});
                console.log("addNewLendingContract");
                await lendingInstance.methods.saveInitialParametersToStorage(
                    '2',//maxDefaultDays
                    '1',//tier
                    '20',//community members
                    community //community rep wallet
                ).send({from:accounts[0],gas: 4000000});

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
