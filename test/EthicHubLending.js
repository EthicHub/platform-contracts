'use strict';
import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const BigNumber = web3.BigNumber
const web3_1_0 = require('web3');
const utils = web3_1_0.utils;
const Uninitialized = 0;
const AcceptingContributions = 1;
const ExchangingToFiat = 2;
const AwaitingReturn = 3;
const ProjectNotFunded = 4;
const ContributionReturned = 5;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const EthicHubLending = artifacts.require('EthicHubLending');
const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol');
const MockReputation = artifacts.require('./helper_contracts/MockReputation.sol');

contract('EthicHubLending', function ([owner, borrower, investor, investor2, investor3, investor4, investor5, wallet]) {
    beforeEach(async function () {
        await advanceBlock();

        this.fundingStartTime = latestTime() + duration.days(1);
        this.fundingEndTime = this.fundingStartTime + duration.days(40);
        this.lendingInterestRatePercentage = 115;
        this.totalLendingAmount = ether(3);
        this.tier = 1;
        //400 pesos per eth
        this.initialEthPerFiatRate = 400;
        this.finalEthPerFiatRate = 500;
        this.lendingDays = 90;
        this.defaultMaxDays = 90;

        this.mockStorage = await MockStorage.new();
        this.mockReputation = await MockReputation.new();
        console.log(this.mockReputation.address);
        await this.mockStorage.setAddress(utils.soliditySha3("contract.name", "reputation"),this.mockReputation.address);
        this.lending = await EthicHubLending.new(
                                                this.fundingStartTime,
                                                this.fundingEndTime,
                                                borrower,
                                                this.lendingInterestRatePercentage,
                                                this.totalLendingAmount,
                                                this.lendingDays,
                                                this.mockStorage.address
                                            );
        this.lending.saveInitialParametersToStorage(this.defaultMaxDays, this.tier);
    });

    describe('initializing', function() {
        it('should not allow to invest before initializing', async function () {
            var someLending = await EthicHubLending.new(
                                                    this.fundingStartTime,
                                                    this.fundingEndTime,
                                                    borrower,
                                                    this.lendingInterestRatePercentage,
                                                    this.totalLendingAmount,
                                                    this.lendingDays,
                                                    this.mockStorage.address
                                                );
            await increaseTimeTo(this.fundingStartTime - duration.days(0.5))
            var isRunning = await someLending.isContribPeriodRunning();
            var state = await someLending.state();
            // project not funded
            state.toNumber().should.be.equal(Uninitialized);
            isRunning.should.be.equal(false);
            await someLending.sendTransaction({value:ether(1), from: investor}).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('contributing', function() {
        it('should not allow to invest before contribution period', async function () {
            await increaseTimeTo(this.fundingStartTime - duration.days(0.5))
            var isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(false);
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.rejectedWith(EVMRevert);
        });

        it('should not allow to invest after contribution period', async function () {
            await increaseTimeTo(this.fundingEndTime  + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(false);
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.rejectedWith(EVMRevert);
        });

        it('should allow to invest in contribution period', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
        });

        it('should not allow to invest with cap fulfilled', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
            var isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);
            await this.lending.sendTransaction({value:ether(1), from: investor2}).should.be.fulfilled;
            isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);
            await this.lending.sendTransaction({value:ether(1), from: investor3}).should.be.fulfilled;
            isRunning = await this.lending.isContribPeriodRunning();
            isRunning.should.be.equal(false);
            await this.lending.sendTransaction({value:ether(1), from: investor4}).should.be.rejectedWith(EVMRevert);
        });

        it('should return extra value over cap to last investor', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            var initialBalance = await web3.eth.getBalance(investor2);
            await this.lending.sendTransaction({value:ether(2), from: investor}).should.be.fulfilled;
            await this.lending.sendTransaction({value:ether(1.5), from: investor2}).should.be.fulfilled;
            var afterInvestmentBalance = await web3.eth.getBalance(investor2);

        });

    });

    describe('Retrieving contributions', function() {
      it('should allow to retrieve contributions after declaring project not funded', async function () {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1))
          await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
          var balance = await web3.eth.getBalance(this.lending.address);
          balance.toNumber().should.be.equal(ether(1).toNumber());
          await increaseTimeTo(this.fundingEndTime  + duration.days(1))
          await this.lending.declareProjectNotFunded({from: owner})
          var state = await this.lending.state();
          // project not funded
          state.toNumber().should.be.equal(ProjectNotFunded);
          var balance = web3.eth.getBalance(this.lending.address);
          balance.toNumber().should.be.equal(ether(1).toNumber());
          // can reclaim contribution from everyone
          balance = web3.eth.getBalance(investor);
          await this.lending.reclaimContribution(investor).should.be.fulfilled;
          // 0.1 eth less due to used gas
          new BigNumber(await web3.eth.getBalance(investor)).should.be.bignumber.above(new BigNumber(balance).add(ether(0.9).toNumber()));
          // fail to reclaim from no investor
          await this.lending.reclaimContribution(investor2).should.be.rejectedWith(EVMRevert);
      });

      it('should not allow to retrieve contributions if not contributor paid', async function () {
        await increaseTimeTo(this.fundingStartTime  + duration.days(1))
        await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
        var balance = await web3.eth.getBalance(this.lending.address);
        balance.toNumber().should.be.equal(ether(1).toNumber());
        await increaseTimeTo(this.fundingEndTime  + duration.days(1))
        await this.lending.declareProjectNotFunded({from: owner})
        var state = await this.lending.state();
        // project not funded
        state.toNumber().should.be.equal(ProjectNotFunded);
        await this.lending.reclaimContribution(investor3).should.be.rejectedWith(EVMRevert);

      });

      it('should not allow to retrieve contributions before declaring project not funded', async function () {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1))
          await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
          var balance = await web3.eth.getBalance(this.lending.address);
          balance.toNumber().should.be.equal(ether(1).toNumber());
          await increaseTimeTo(this.fundingEndTime  + duration.days(1))
          // can reclaim contribution from everyone
          balance = web3.eth.getBalance(investor);
          await this.lending.reclaimContribution(investor).should.be.rejectedWith(EVMRevert);

      });

      it('should not allow to retrieve contributions without interest after project is paid', async function () {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1));
          const investment2 = this.totalLendingAmount;
          const investor2InitialBalance = await web3.eth.getBalance(investor2);
          await this.lending.sendTransaction({value: investment2, from: investor2}).should.be.fulfilled;
          await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
          await this.lending.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: owner}).should.be.fulfilled;
          const borrowerReturnAmount = await this.lending.borrowerReturnAmount();
          await this.lending.sendTransaction({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled;
          await this.lending.reclaimContribution(investor2).should.be.rejectedWith(EVMRevert);
      });

    })


    describe('Exchange period', function() {

      it('should go to exchange state after cap reached', async function() {
        await increaseTimeTo(this.fundingStartTime  + duration.days(1))
        await this.lending.sendTransaction({value:this.totalLendingAmount, from: investor}).should.be.fulfilled;

        var capReached = await this.lending.capReached();
        capReached.should.be.equal(true);
    //    await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
        var state = await this.lending.state();
        state.toNumber().should.be.equal(ExchangingToFiat);

      });

      it('should transfer to borrower after cap reached', async function() {
        var initialBorrowerBalance = await web3.eth.getBalance(borrower);
        await increaseTimeTo(this.fundingStartTime  + duration.days(1))
        await this.lending.sendTransaction({value:this.totalLendingAmount, from: investor}).should.be.fulfilled;

        var balance = await web3.eth.getBalance(this.lending.address);
        balance.should.be.bignumber.equal(new BigNumber(0));
        var finalBorrowerBalance = await web3.eth.getBalance(borrower);
        var balance = finalBorrowerBalance.sub(initialBorrowerBalance);
        balance.should.be.bignumber.equal(this.totalLendingAmount);
      });


      it('should fail to change state to AwaitingReturn before exchanged', async function() {
        await increaseTimeTo(this.fundingStartTime  + duration.days(1))
        await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
        await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.rejectedWith(EVMRevert);;
      });

      it('should calculate correct fiat amount after exchange', async function() {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1))
          await this.lending.sendTransaction({value:this.totalLendingAmount, from: investor}).should.be.fulfilled;
          await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
          var contractinitialEthPerFiatRate = await this.lending.initialEthPerFiatRate();
          contractinitialEthPerFiatRate.toNumber().should.be.equal(this.initialEthPerFiatRate);

          const lendingFiatAmount = new BigNumber(this.initialEthPerFiatRate).mul(this.totalLendingAmount);
          const contractTotalLendingFiatAmount = await this.lending.totalLendingFiatAmount();
          contractTotalLendingFiatAmount.should.be.bignumber.equal(lendingFiatAmount);

          const contractBorrowerReturnFiatAmount = await this.lending.borrowerReturnFiatAmount();
          const borrowerReturnFiatAmount = lendingFiatAmount.mul(this.lendingInterestRatePercentage).div(100);
          contractBorrowerReturnFiatAmount.should.be.bignumber.equal(borrowerReturnFiatAmount);

      });

      it('should advance state after setting inital fiat amount', async function() {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1))
          await this.lending.sendTransaction({value:this.totalLendingAmount, from: investor}).should.be.fulfilled;
          await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
          const state = await this.lending.state();
          state.toNumber().should.be.equal(AwaitingReturn);

      });

      it('should not allow setting to unauthorized investors', async function() {
          await increaseTimeTo(this.fundingStartTime  + duration.days(1))
          await this.lending.sendTransaction({value:this.totalLendingAmount, from: investor}).should.be.fulfilled;
          await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: investor3}).should.be.rejectedWith(EVMRevert);


      });
    });

    describe('Borrower return', function() {

        it('should set correct parameters', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value: this.totalLendingAmount, from: investor}).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            await this.lending.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: owner}).should.be.fulfilled;
            var state = await this.lending.state();
            state.toNumber().should.be.equal(AwaitingReturn);
            const borrowerReturnEthPerFiatRate = await this.lending.borrowerReturnEthPerFiatRate();
            borrowerReturnEthPerFiatRate.should.be.bignumber.equal(new BigNumber(this.finalEthPerFiatRate));
            const lendingFiatAmount = new BigNumber(this.initialEthPerFiatRate).mul(this.totalLendingAmount);
            const borrowerReturnFiatAmount = lendingFiatAmount.mul(this.lendingInterestRatePercentage).div(100);
            const borrowerReturnAmount = borrowerReturnFiatAmount.div(this.finalEthPerFiatRate);
            const contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount();
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount);
        });

        it('should not allow to stablish return in other state', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value: this.totalLendingAmount, from: investor}).should.be.fulfilled;
            await this.lending.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: owner}).should.be.rejectedWith(EVMRevert);
        });
        it('should not allow to return contribution before setting exchange rate', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value: this.totalLendingAmount, from: investor}).should.be.fulfilled;
            await this.lending.returnBorrowedEth({from: owner, value: ether(2)}).should.be.rejectedWith(EVMRevert);
        });
        it('should allow the retun of proper amount', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value: this.totalLendingAmount, from: investor}).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            await this.lending.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: owner}).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            await this.lending.sendTransaction({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled;

        });
        it('should not allow the retun of different amount', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value: this.totalLendingAmount, from: investor}).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            await this.lending.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: owner}).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            await this.lending.sendTransaction({value: borrowerReturnAmount.sub(1), from: borrower}).should.be.rejectedWith(EVMRevert);

        });


    });

    describe('Retrieve contribution with interest', async function() {

        it('Should return investors contributions with interests', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1));

            const investment2 = ether(0.9);
            const investment3 = ether(1.3);
            const investment4 = ether(0.8);

            const investor2InitialBalance = await web3.eth.getBalance(investor2);
            const investor3InitialBalance = await web3.eth.getBalance(investor3);
            const investor4InitialBalance = await web3.eth.getBalance(investor4);

            const txSend2 = await this.lending.sendTransaction({value: investment2, from: investor2}).should.be.fulfilled;
            await this.lending.sendTransaction({value: investment3, from: investor3}).should.be.fulfilled;
            await this.lending.sendTransaction({value: investment4, from: investor4}).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            await this.lending.setBorrowerReturnEthPerFiatRate(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            await this.lending.sendTransaction({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled;
            const txReceive2 = await this.lending.reclaimContributionWithInterest(investor2);
            await this.lending.reclaimContributionWithInterest(investor3);
            await this.lending.reclaimContributionWithInterest(investor4);

            const balance = await web3.eth.getBalance(this.lending.address);
            console.log("Remaining balance:");
            console.log(balance);
            balance.toNumber().should.be.equal(0);

            console.log("---> Investor 2");
            const investor2FinalBalance = await web3.eth.getBalance(investor2);
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, this);
            checkInvestmentResults(investor2InitialBalance,expectedInvestor2Balance,investor2FinalBalance);

            console.log("---> Investor 3");
            const investor3FinalBalance = await web3.eth.getBalance(investor3);
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, this);
            checkInvestmentResults(investor3InitialBalance ,expectedInvestor3Balance, investor3FinalBalance);

            console.log("---> Investor 4");
            const investor4FinalBalance = await web3.eth.getBalance(investor4);
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, this);
            checkInvestmentResults(investor4InitialBalance, expectedInvestor4Balance, investor4FinalBalance);

        });

        it('Should not allow returns when contract have balance in other state', async function() {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1));
            const investment2 = ether(1);
            await this.lending.sendTransaction({value: investment2, from: investor2}).should.be.fulfilled;
            await this.lending.reclaimContributionWithInterest(investor2).should.be.rejectedWith(EVMRevert);
        });

    })

    describe('selfKill', function() {
        it('selfKill', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
            await this.lending.sendTransaction({value:ether(1), from: investor2}).should.be.fulfilled;
            var balance = web3.eth.getBalance(owner);
            await this.lending.selfKill({from:investor}).should.be.rejectedWith(EVMRevert);
            await this.lending.selfKill({from:owner}).should.be.fulfilled;
            // 0.1 eth less due to used gas
            new BigNumber(web3.eth.getBalance(owner)).should.be.bignumber.above(new BigNumber(balance).add(ether(1.9)));

        });
    });

    function getExpectedInvestorBalance(initialAmount,contribution,testEnv) {

        const received = contribution.mul(testEnv.initialEthPerFiatRate)
                            .mul(testEnv.lendingInterestRatePercentage)
                            .div(testEnv.finalEthPerFiatRate).div(100);
        return initialAmount.add(received);

    }

    function checkInvestmentResults(investorInitialBalance, expected, actual) {
        //console.log("Initial balance:");
        // console.log(utils.fromWei(investorInitialBalance, 'ether').toNumber());
        // console.log("Expected balance:");
        // console.log(utils.fromWei(expected, 'ether').toNumber());
        // console.log("Actual balance:");
        // console.log(utils.fromWei(actual, 'ether').toNumber());
        //TODO: more exact calculation
        investorInitialBalance.should.be.bignumber.below(actual);
    }

/*
    describe('Integration Tests', function() {
        it('cap not reached', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(1).toNumber());
            await increaseTimeTo(this.fundingEndTime  + duration.days(1))
            await this.lending.declareProjectNotFunded({from: owner})
            var state = await this.lending.state();
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded);
            var balance = web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(1).toNumber());
            // can reclaim contribution from everyone
            balance = web3.eth.getBalance(investor);
            await this.lending.reclaimContribution(investor).should.be.fulfilled;
            // 0.1 eth less due to used gas
            new BigNumber(await web3.eth.getBalance(investor)).should.be.bignumber.above(new BigNumber(balance).add(ether(0.9).toNumber()));
            // fail to reclaim from no investor
            await this.lending.reclaimContribution(investor2).should.be.rejectedWith(EVMRevert);
        });

        it('cap reached', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            var borrowerBalance = await web3.eth.getBalance(borrower);
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
            await this.lending.sendTransaction({value:ether(1), from: investor2}).should.be.fulfilled;
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(2).toNumber());
            await this.lending.sendTransaction({value:ether(1), from: investor3}).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;
            await increaseTimeTo(this.fundingEndTime  + duration.days(1))
            new BigNumber(await web3.eth.getBalance(borrower)).should.be.bignumber.above(new BigNumber(borrowerBalance).add(ether(2.9).toNumber()));
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(0).toNumber());

            // project funded
            var state = await this.lending.state();
            state.toNumber().should.be.equal(1)

            // can reclaim contribution from everyone
            await this.lending.reclaimContribution(investor).should.be.rejectedWith(EVMRevert);

            var fiatAmount = await this.lending.borrowerReturnFiatAmount();
            new BigNumber(fiatAmount).should.be.bignumber.equal(new BigNumber(ether(3)).mul(this.lendingInterestRatePercentage).div(100).mul(400));

            // should set rate before
            await this.lending.returnBorrowedEth({value: ether(3)}).should.be.rejectedWith(EVMRevert);
            await this.lending.setBorrowerReturnEthPerFiatRate(500, {from: owner}).should.be.fulfilled;

            var borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            new BigNumber(borrowerReturnAmount).should.be.bignumber.equal(new BigNumber(fiatAmount).div(500));

            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(0).toNumber());
            await this.lending.sendTransaction({value: borrowerReturnAmount + 1}).should.be.rejectedWith(EVMRevert);
            await this.lending.returnBorrowedEth({value: borrowerReturnAmount}).should.be.fulfilled;
            var state = await this.lending.state();
            state.toNumber().should.be.equal(3);
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(borrowerReturnAmount.toNumber());
            await this.lending.reclaimContributionWithInterest(investor)
            await this.lending.reclaimContributionWithInterest(investor2)
            await this.lending.reclaimContributionWithInterest(investor3)
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(0);

        });


        it('can return with sendTransaction', async function () {
            await increaseTimeTo(this.fundingStartTime  + duration.days(1))
            var borrowerBalance = await web3.eth.getBalance(borrower);
            await this.lending.sendTransaction({value:ether(1), from: investor}).should.be.fulfilled;
            await this.lending.sendTransaction({value:ether(1), from: investor2}).should.be.fulfilled;
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(2).toNumber());
            await this.lending.sendTransaction({value:ether(1), from: investor3}).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: owner}).should.be.fulfilled;

            await increaseTimeTo(this.fundingEndTime  + duration.days(1))
            new BigNumber(await web3.eth.getBalance(borrower)).should.be.bignumber.above(new BigNumber(borrowerBalance).add(ether(2.9).toNumber()));
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(0).toNumber());

            // project funded
            var state = await this.lending.state();
            state.toNumber().should.be.equal(1)

            await this.lending.reclaimContribution(investor).should.be.rejectedWith(EVMRevert);

            var fiatAmount = await this.lending.borrowerReturnFiatAmount();
            new BigNumber(fiatAmount).should.be.bignumber.equal(new BigNumber(ether(3)).mul(this.lendingInterestRatePercentage).div(100).mul(400));

            // should set rate before
            await this.lending.returnBorrowedEth({value: ether(3)}).should.be.rejectedWith(EVMRevert);
            await this.lending.setBorrowerReturnEthPerFiatRate(500, {from: owner}).should.be.fulfilled;

            var borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            new BigNumber(borrowerReturnAmount).should.be.bignumber.equal(new BigNumber(fiatAmount).div(500));

            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(0).toNumber());
            var state = await this.lending.state();
            await this.lending.sendTransaction({value: borrowerReturnAmount+1}).should.be.rejectedWith(EVMRevert);
            await this.lending.sendTransaction({value: borrowerReturnAmount}).should.be.fulfilled;
            var state = await this.lending.state();
            state.toNumber().should.be.equal(3);
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(borrowerReturnAmount.toNumber());
            await this.lending.reclaimContributionWithInterest(investor)
            await this.lending.reclaimContributionWithInterest(investor2)
            await this.lending.reclaimContributionWithInterest(investor3)
            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(0);

        });

    });
*/
})