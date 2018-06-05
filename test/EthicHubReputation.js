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

const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol');
const EthicHubReputation = artifacts.require('EthicHubReputation');
const EthicHubBase = artifacts.require('EthicHubBase');

contract('EthicHubReputation', function ([owner, community, localNode, lendingContract]) {
    beforeEach(async function () {
        //await advanceBlock();
        this.maxDelayDays = new BigNumber(100);
        //10 with 2 decimals
        this.maxReputation = new BigNumber(1000);
        this.reputationStep = new BigNumber(100);
        this.initialReputation = this.maxReputation.mul(0.5);

        this.minimumPeopleCommunity = new BigNumber(20);
        this.minimumTier = new BigNumber(1);
        this.minimumProject = new BigNumber(1).mul(this.minimumPeopleCommunity);
        //0.05
        this.incrLocalNodeMultiplier = new BigNumber(5);

        this.mockStorage = await MockStorage.new();
        this.reputation = await EthicHubReputation.new(this.mockStorage.address);

    });

    describe('Community decrement', function() {
        it('should burn 1% per day passed after 100 days max', async function() {
            const initialReputation = this.maxReputation.mul(0.5);
            for (var delayDays = 1; delayDays<=100; delayDays++) {
                const newRep = await this.reputation.burnCommunityReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
                //console.log("-----");
                //console.log("DelayDays: "+delayDays);
                //console.log("new rep: " +newRep.toNumber());
                var expectedRep = initialReputation.sub(initialReputation.mul(delayDays).div(this.maxDelayDays)).toNumber();
                expectedRep = Math.floor(expectedRep);
                //console.log("expected rep: "+expectedRep)
                newRep.should.be.bignumber.equal(expectedRep);
            }

        });
        it('should burn 10% per day passed after 100 days max', async function() {
            const delayDays = new BigNumber(10);
            const initialReputation = this.maxReputation.mul(0.5);
            const newRep = await this.reputation.burnCommunityReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
            var expectedRep = initialReputation.sub(initialReputation.mul(delayDays).div(this.maxDelayDays)).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);
        });
        it('should burn 100% per day passed after 100 days max', async function() {
            const delayDays = this.maxReputation;
            const newRep = await this.reputation.burnCommunityReputation(delayDays,this.maxDelayDays, 100).should.be.fulfilled;
            newRep.should.be.bignumber.equal(0);
        });
    });

    describe('Community increment', function() {
        it('should add 1/CompletedSameTierProjects', async function() {
            var rep = this.initialReputation;
            //console.log("-----");
            //console.log("Initial reputation");
            //console.log(rep.toNumber());
            for (var succesfulSameTierProjects=1;succesfulSameTierProjects<100;succesfulSameTierProjects++) {
                const prevRep = rep;
                rep = await this.reputation.incrementCommunityReputation(prevRep,succesfulSameTierProjects).should.be.fulfilled;
                //console.log("--> Projects same tier: "+succesfulSameTierProjects);
                //console.log("Rep: " + rep.toNumber());
                const increment = new BigNumber(100).div(succesfulSameTierProjects);
                const expectedRep = Math.floor(prevRep.add(increment).toNumber());
                rep.should.be.bignumber.equal(expectedRep);
            }
        });

        it('should not assign more than max reputation', async function() {
            var prevRep = this.maxReputation.sub(1);
            var newRep = await this.reputation.incrementCommunityReputation(prevRep,1).should.be.fulfilled;
            newRep.should.be.bignumber.equal(this.maxReputation);
        });

        it('should fail to set reputation with no succesful projects in a tier', async function() {
            await this.reputation.incrementCommunityReputation(500,0).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('Local node increment', function() {
        it('should increment correct number', async function() {
            var prevRep = this.initialReputation;
            var community = this.minimumPeopleCommunity;
            for(var tier = 1; tier <= 5; tier++) {
                var newRep = await this.reputation.incrementLocalNodeReputation(prevRep,tier,community).should.be.fulfilled;
                //console.log("Tier: "+tier);
                //console.log("New rep: "+ newRep.toNumber());
                var increment = (new BigNumber(tier).mul(community).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier);//.div(1000);
                var expectedRep = prevRep.add(increment);
                //console.log("Expected Rep: "+expectedRep);
                newRep.should.be.bignumber.equal(expectedRep);
            }
        });

        it('should increment correct number with more members in the community', async function() {
            var prevRep = this.initialReputation;
            var community = new BigNumber(100);
            var tier = 3;
            var newRep = await this.reputation.incrementLocalNodeReputation(prevRep,3,community).should.be.fulfilled;
            var increment = (new BigNumber(tier).mul(community).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier);//.div(1000);
            var expectedRep = prevRep.add(increment);
            newRep.should.be.bignumber.equal(expectedRep);

        });

        it('should not increment over max rep', async function() {
            var prevRep = this.maxReputation.sub(1);
            var newRep = await this.reputation.incrementLocalNodeReputation(prevRep,1,40).should.be.fulfilled;
            newRep.should.be.bignumber.equal(this.maxReputation);
        });
    });

    describe('Local node decrement', function() {
        it('should burn same as commnity, max 1 step (100) ', async function() {
            const initialReputation = this.maxReputation.mul(0.5);
            var delayDays = 1;
            var newRep = await this.reputation.burnLocalNodeReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
            var decrement = initialReputation.mul(delayDays).div(this.maxDelayDays);
            var expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = 10;
            newRep = await this.reputation.burnLocalNodeReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
            decrement = initialReputation.mul(delayDays).div(this.maxDelayDays);
            expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = 60;
            newRep = await this.reputation.burnLocalNodeReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
            decrement = this.reputationStep;
            expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = this.maxDelayDays.add(1);
            newRep = await this.reputation.burnLocalNodeReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;
            expectedRep = new BigNumber(0);
            newRep.should.be.bignumber.equal(expectedRep);

        });

        it('should not burn less than 0', async function() {
            const initialReputation = new BigNumber(0);
            var delayDays = 1;
            var newRep = await this.reputation.burnLocalNodeReputation(delayDays,this.maxDelayDays, initialReputation).should.be.fulfilled;

            newRep.should.be.bignumber.equal(initialReputation);
        });



    });

    describe('From storage -> burn', function() {
        it ('should not decrement another that is not lending contract', async function () {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            const delayDays = new BigNumber(0);
            await this.reputation.burnReputation(delayDays, {from: owner}).should.be.rejectedWith(EVMRevert);
        });
        it('Should burn reputation', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract),this.maxDelayDays);
            const delayDays = new BigNumber(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract),delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {from: lendingContract}).should.be.fulfilled;

            //Community rep
            const rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            var expectedRep = initialCommunityReputation.sub(initialCommunityReputation.mul(delayDays).div(this.maxDelayDays)).toNumber();
            expectedRep = Math.floor(expectedRep);
            rep.should.be.bignumber.equal(expectedRep);

            //Local Node rep
            var newRep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            var decrement = initialLocalNodeReputation.mul(delayDays).div(this.maxDelayDays);
            var expectedRep = initialLocalNodeReputation.sub(decrement).toNumber();
            expectedRep = Math.floor(expectedRep);
            newRep.should.be.bignumber.equal(expectedRep);
        });

        it('Lending contract should have a community', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract),this.maxDelayDays);
            const delayDays = new BigNumber(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract),delayDays);
            //await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Lending contract should have a localNode', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract),this.maxDelayDays);
            const delayDays = new BigNumber(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract),delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            //await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Lending should have a maxDelayDays localNode', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            //await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract),this.maxDelayDays);
            const delayDays = new BigNumber(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract),delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Lending contract should be in default', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract),this.maxDelayDays);
            const delayDays = new BigNumber(0);
            //await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract),delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

    });

    describe('From storage -> increase', function() {
        it ('should not increment another that is not lending contract', async function () {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            const completedProjectsByTier = new BigNumber(0);
            await this.reputation.incrementReputation(completedProjectsByTier, {from: owner}).should.be.rejectedWith(EVMRevert);
        });
        it('Should increase reputation', async function() {
            const projectTier = new BigNumber(1);
            const previouslyCompletedProjects = new BigNumber(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract),projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract),this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {from: lendingContract}).should.be.fulfilled;

            //Community rep
            var rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            var increment = new BigNumber(100).div(previouslyCompletedProjects);
            var expectedRep = Math.floor(initialCommunityReputation.add(increment).toNumber());
            rep.should.be.bignumber.equal(expectedRep);

            //Local Node rep
            var newLocalRep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            increment = (new BigNumber(projectTier).mul(this.minimumPeopleCommunity).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier);//.div(1000);
            expectedRep = initialLocalNodeReputation.add(increment);
            //console.log("Expected Rep: "+expectedRep);
            newLocalRep.should.be.bignumber.equal(expectedRep);
        });
        it('Should fail without a community', async function() {
            const projectTier = new BigNumber(1);
            const previouslyCompletedProjects = new BigNumber(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract),projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract),this.minimumPeopleCommunity);

            //await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Should fail without a localNode', async function() {
            const projectTier = new BigNumber(1);
            const previouslyCompletedProjects = new BigNumber(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract),projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract),this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            //await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Should fail without an assigned tier in lending', async function() {
            const projectTier = new BigNumber(1);
            const previouslyCompletedProjects = new BigNumber(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            //await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract),projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract),this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });

        it('Should fail without a succesful project', async function() {
            const projectTier = new BigNumber(1);
            const previouslyCompletedProjects = new BigNumber(0);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract),projectTier);
            //await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract),this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract),community);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract),localNode);
            const initialCommunityReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community),initialCommunityReputation);
            const initialLocalNodeReputation = new BigNumber(500);
            await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode),initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {from: lendingContract}).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('reputation default values', function() {
        it('Should initialize localNode reputation', async function() {
            // set fake user contract using owner
            await this.mockStorage.setAddress(utils.soliditySha3("contract.name", "users"), owner);
            await this.reputation.initLocalNodeReputation(localNode).should.be.fulfilled;
            const default_rep = await this.reputation.initReputation();
            var rep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            default_rep.should.be.bignumber.equal(rep);
        });

        it('Should initialize community reputation', async function() {
            // set fake user contract using owner
            await this.mockStorage.setAddress(utils.soliditySha3("contract.name", "users"), owner);
            await this.reputation.initCommunityReputation(community).should.be.fulfilled;
            const default_rep = await this.reputation.initReputation();
            const rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            default_rep.should.be.bignumber.equal(rep);
        });

    });
});
