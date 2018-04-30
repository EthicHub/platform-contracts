const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;



//const Lending = artifacts.require('Lending');
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const cmc = artifacts.require('./EthichubCMC.sol');
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');


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
  return new web3.BigNumber(web3.toWei(n, 'ether'))
}

function now() {
  return Math.round((new Date()).getTime() / 1000);
}


module.exports = async (deployer, network) => {
    /*
    //01/10/2018
    fundingStartTime = now() + duration.minutes(1);
    //01/20/2018
    fundingEndTime = fundingStartTime + duration.days(1);
    lendingInterestRatePercentage = 115;
    // 3 eths
    totalLendingAmount = 3000000000000000000;
    //400 pesos per eth
    initialEthPerFiatRate = 400;
    lendingDays = 90;

    deployer.deploy(Lending, fundingStartTime, fundingEndTime, web3.eth.accounts[1], lendingInterestRatePercentage, totalLendingAmount, lendingDays)
    */

    //deploy lending with storage
    return deployer.deploy(storage).then(() => {
        return deployer.deploy(cmc, storage.address).then(() => {
            return storage.deployed().then(async storageInstance => {
                console.log(await storageInstance.getAddress(utils.soliditySha3("ethichub.contract", web3.eth.accounts[0])))
                // using storage owner to add cmc in ethichub contract network
                await storageInstance.setAddress(utils.soliditySha3("ethichub.contract", cmc.address), cmc.address)
                console.log(await storageInstance.getAddress(utils.soliditySha3("ethichub.contract", web3.eth.accounts[0])))
                return deployer.deploy(reputation, storage.address).then(() => {
                   return cmc.deployed().then(async cmcInstance => {
                        cmcInstance.addNewReputationContract(reputation.address)
                    })
                })
            })
        })
    })
     
};
