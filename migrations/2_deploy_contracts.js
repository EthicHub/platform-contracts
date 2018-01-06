const Lending = artifacts.require('Lending');

module.exports = function(deployer) {
    //01/10/2018
    fundingStartTime = 1515542400;
    //01/20/2018
    fundingEndTime = 1516406400;
    lendingInterestRatePercentage = 115;
    // 3 eths
    totalLendingAmount = 3000000000000000000;
    //400 pesos per eth
    initialEthPerFiatRate = 400;
    lendingDays = 90;

    deployer.deploy(Lending, fundingStartTime, fundingEndTime, '0x4a42CEAad068a8C926E19231d149ed3c1238E51F', lendingInterestRatePercentage, totalLendingAmount, initialEthPerFiatRate, lendingDays)
};
