'use strict';
import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol')
const EthicHubReputation = artifacts.require('EthicHubReputation');
const EthicHubBase = artifacts.require('EthicHubBase');

contract('EthicHubReputation', function ([owner, community, localNode]) {
    beforeEach(async function () {
        await advanceBlock();
        this.mockStorage = await MockStorage.new();
        this.reputation = await EthicHubReputation.new(this.mockStorage.address);
        this.lendingMock = await EthicHubBase.new(this.mockStorage.address);
        this.lendingAddress = this.lendingMock.address;
        this.maxDefaultDays = new BigNumber(100);
        //10 with 2 decimals
        this.maxReputation = new BigNumber(1000);
        this.initialReputation = this.maxReputation.mul(0.5);
    });

    describe('Community decrement', function() {
        it('should burn 1% per day passed after 100 days max', async function() {
            const defaultDays = new BigNumber(1);
            const initialReputation = this.maxReputation.mul(0.5);
            const newRep = await this.reputation.burnCommunityReputation(defaultDays,this.maxDefaultDays, initialReputation).should.be.fulfilled;
            var expectedRep = initialReputation.sub(initialReputation.mul(defaultDays).div(this.maxDefaultDays)).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);
        });
        it('should burn 10% per day passed after 100 days max', async function() {
            const defaultDays = new BigNumber(10);
            const initialReputation = this.maxReputation.mul(0.5);
            const newRep = await this.reputation.burnCommunityReputation(defaultDays,this.maxDefaultDays, initialReputation).should.be.fulfilled;
            var expectedRep = initialReputation.sub(initialReputation.mul(defaultDays).div(this.maxDefaultDays)).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);
        });
        it('should burn 100% per day passed after 100 days max', async function() {
            const defaultDays = this.maxReputation;
            const newRep = await this.reputation.burnCommunityReputation(defaultDays,this.maxDefaultDays, 100).should.be.fulfilled;
            newRep.should.be.bignumber.equal(0);
        });
    });

    describe('Community increment', function() {
        it.only('should add 1/CompletedSameTierProjects', async function() {
            var rep = this.initialReputation;
            console.log("-----");
            console.log("Initial reputation");
            console.log(rep.toNumber());
            for (var succesfulSameTierProjects=1;succesfulSameTierProjects<100;succesfulSameTierProjects++) {
                const prevRep = rep;
                rep = await this.reputation.incrementCommunityReputation(prevRep,succesfulSameTierProjects).should.be.fulfilled;
                console.log("--> Projects same tier: "+succesfulSameTierProjects);
                console.log("Rep: " + rep.toNumber());
                const increment = new BigNumber(100).div(succesfulSameTierProjects);
                const expectedRep = Math.floor(prevRep.add(increment).toNumber());
                rep.should.be.bignumber.equal(expectedRep);
            }

        });

        it.only('should not assign more than max reputation', async function() {
            var prevRep = this.maxReputation.sub(1);
            var newRep = await this.reputation.incrementCommunityReputation(prevRep,1).should.be.fulfilled;
            newRep.should.be.bignumber.equal(this.maxReputation);

        });

        it.only('should fail to set reputation with no succesful projects in a tier', async function() {
            await this.reputation.incrementCommunityReputation(500,0).should.be.rejectedWith(EVMRevert);
        });

    });

    describe('From storage -> community burn', function() {
        it('should burn 1% per day passed after 100 days max', async function() {

            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDefaultDays", this.lendingAddress),this.maxDefaultDays);
            const defaultDays = new BigNumber(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.defaultDays", this.lendingAddress),defaultDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", this.lendingAddress),community);
            const initialReputation = new BigNumber(100);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialReputation);

            await this.reputation.burnReputation(this.lendingMock.address).should.be.fulfilled;

            const rep = await this.mockStorage.getUint(utils.soliditySha3("community.reputation", community)).should.be.fulfilled;
            var expectedRep = initialReputation.sub(initialReputation.mul(defaultDays).div(this.maxDefaultDays)).toNumber();
            expectedRep = Math.floor(expectedRep);
            rep.should.be.bignumber.equal(expectedRep);
        });

        it('should burn 100% per day passed after 100 days max', async function() {
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDefaultDays", this.lendingAddress),this.maxDefaultDays);
            await this.mockStorage.setUint(utils.soliditySha3("lending.defaultDays", this.lendingAddress),this.maxDefaultDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", this.lendingAddress),community);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),100);

            await this.reputation.burnReputation(this.lendingMock.address).should.be.fulfilled;

            const rep = await this.mockStorage.getUint(utils.soliditySha3("community.reputation", community)).should.be.fulfilled;
            rep.should.be.bignumber.equal(0);
        });
    });
});
