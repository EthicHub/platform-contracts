const Lending = artifacts.require('Lending');
const Reputation = artifacts.require('Reputation');

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


module.exports = function(deployer) {
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
    deployer.then(function() {
        return Reputation.new();
    }).then(function(reputation) {
        console.log(reputation.address)
        console.log(reputation.address)
        reputation.addLendingContract(fundingStartTime, fundingEndTime, web3.eth.accounts[1], lendingInterestRatePercentage, totalLendingAmount, lendingDays)
        //return deployer.deploy(Lending, fundingStartTime, fundingEndTime, web3.eth.accounts[1], lendingInterestRatePercentage, totalLendingAmount, lendingDays, Reputation.address)
    });
};
