'use strict';
import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const BigNumber = web3.BigNumber

const AcceptingContributions = 0;
const ExchangingToFiat = 1;
const AwaitingReturn = 2;
const ProjectNotFunded = 3;
const ContributionReturned = 4;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const Lending = artifacts.require('Lending');

contract('Lending', function ([owner, borrower, investor, investor2, investor3, investor4, investor5, wallet]) {
    beforeEach(async function () {
        await advanceBlock();

        this.fundingStartTime = latestTime() + duration.days(1);
        this.fundingEndTime = this.fundingStartTime + duration.days(40);
        this.lendingInterestRatePercentage = 115;
        this.totalLendingAmount = ether(3);
        //400 pesos per eth
        this.initialEthPerFiatRate = 400;
        this.lendingDays = 90;
        this.lending = await Lending.new(this.fundingStartTime, this.fundingEndTime, borrower, this.lendingInterestRatePercentage, this.totalLendingAmount,  this.lendingDays);
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

      it('should not allow to retrieve contributions without interest after project is paid');

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

      it('should transfer to borrower state after cap reached', async function() {
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
    });





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
            await this.lending.returnBorroweedEth({value: ether(3)}).should.be.rejectedWith(EVMRevert);
            await this.lending.establishBorrowerReturnEthPerFiatRate(500, {from: owner}).should.be.fulfilled;

            var borrowerReturnAmount = await this.lending.borrowerReturnAmount();
            new BigNumber(borrowerReturnAmount).should.be.bignumber.equal(new BigNumber(fiatAmount).div(500));

            var balance = await web3.eth.getBalance(this.lending.address);
            balance.toNumber().should.be.equal(ether(0).toNumber());
            await this.lending.sendTransaction({value: borrowerReturnAmount + 1}).should.be.rejectedWith(EVMRevert);
            await this.lending.returnBorroweedEth({value: borrowerReturnAmount}).should.be.fulfilled;
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
            await this.lending.returnBorroweedEth({value: ether(3)}).should.be.rejectedWith(EVMRevert);
            await this.lending.establishBorrowerReturnEthPerFiatRate(500, {from: owner}).should.be.fulfilled;

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
