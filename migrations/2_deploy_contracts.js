const Lending = artifacts.require('Lending');

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


const config = {
  rinkeby: {
    fundingStartTime: now() + duration.minutes(1),
    fundingEndTime: now() + duration.minutes(10),
    lendingInterestRatePercentage: 115,
    totalLendingAmount:1000000000000000000,
    lendingDays: 10,
    borrowerAddress: "0x08B909c5c1Fc6bCc4e69BA865b3c38b6365bD894",
  },
  live: {
    fundingStartTime: 1522526400,
    fundingEndTime: 1523736000,
    lendingInterestRatePercentage: 115,
    totalLendingAmount: 2000000000000000000, //2 eth
    lendingDays: 60,
    borrowerAddress: "0x0623b4224763777bed743403c25e37630cefa34a"
  }
};

module.exports = function(deployer) {
    const parameters = config.live;

    deployer.deploy(
      Lending,
      parameters.fundingStartTime,
      parameters.fundingEndTime,
      parameters.borrowerAddress,
      parameters.lendingInterestRatePercentage,
      parameters.totalLendingAmount,
      parameters.lendingDays);
};
