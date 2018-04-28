'use strict';
import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const BigNumber = web3.BigNumber
const utils = web3._extend.utils;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const EthicHubReputation = artifacts.require('EthicHubReputation');

contract('EthicHubReputation', function (accounts) {
    beforeEach(async function () {
        await advanceBlock();
        console.log("Mockstorage");
        //this.mockStorage = new MockStorage();
        console.log("lel");
        //this.reputation = new Reputation(this.mockStorage);
    });

    describe('burning', function() {
        it('should burn 1% per day passed for community', async function() {

        });
    });
});
