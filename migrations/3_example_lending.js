const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;
const fs = require('fs');

const cmc = artifacts.require('./EthicHubCMC.sol');
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

    if (network === 'main') {
        console.log("Skipping example lending on main network");
        return;
    }

    console.log("--> Deploying EthicHubLending...");
    return deployer.deploy(
        lending,
        //Arguments
        now() + duration.days(1),//_fundingStartTime
        now() + duration.days(35),//_fundingEndTime
        accounts[2],//_representative
        10,//_annualInterest
        ether(1),//_totalLendingAmount
        2,//_lendingDays
        storage.address, //_storageAddress
        accounts[3],//localNode
        accounts[4]//team
    ).then(() => {
        return lending.deployed().then(async (lendingInstance) => {

            userManagerInstance = await userManager.deployed();
            cmcInstance = await cmc.deployed();
            //Using accounts [0] because is the only one unlocked by truffle migrate
            await userManagerInstance.changeUserStatus(accounts[0],"localNode",true);
            await userManagerInstance.changeUserStatus(accounts[8],"community",true);
            //Gives set permissions on storage
            await cmcInstance.addNewLendingContract(lendingInstance.address);
            console.log("--> EthicHubLending deployed");
            //Lending saves parameters in storage, checks if owner is localNode
            await lendingInstance.saveInitialParametersToStorage(
                2,//maxDefaultDays
                1,//tier
                20,//community members
                accounts[8]//community rep wallet
            )
            console.log("--> EthicHub network ready");
        });
    });
};
