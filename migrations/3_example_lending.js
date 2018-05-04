const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;


const cmc = artifacts.require('./EthichubCMC.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const lending = artifacts.require('./lending/EthicHubLending.sol');
const storage = artifacts.require('./storage/EthicHubStorage.sol');

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

module.exports = async (deployer, network, accounts) => {

    if (network !== 'ganache' && network !== 'development') {
        console.log("Skipping example lending on dev networks");
        return;
    }
    const instances = await Promise.all([
        storage.deployed(),
        userManager.deployed(),
        cmc.deployed()
    ]);
    const storageInstance = instances[0];
    const userManagerInstance = instances[1];
    const cmcInstance = instances[2];
    //Using accounts [0] because is the only one unlocked by truffle migrate
    await userManagerInstance.changeUserStatus(accounts[0],"localNode",true);

    return deployer.deploy(
        lending,
        //Arguments
        now() + duration.minutes(5),//_fundingStartTime
        now() + duration.minutes(35),//_fundingEndTime
        accounts[2],//_borrower (community)
        115,//_lendingInterestRatePercentage
        ether(3),//_totalLendingAmount
        2,//_lendingDays
        storageInstance.address //_storageAddress
    ).then(() => {
        return lending.deployed().then(async (lendingInstance) => {
            //Gives set permissions on storage
            await cmcInstance.addNewLendingContract(lendingInstance.address);
            //Lending saves parameters in storage, checks if owner is localNode
            await lendingInstance.saveInitialParametersToStorage(
                90,
                1,
                20
            )
        });
    });
};
