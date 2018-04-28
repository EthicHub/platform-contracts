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


const EthicHubBase = artifacts.require('EthicHubBase');
const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol')
const MockEthicHubContract = artifacts.require('./helper_contracts/MockEthicHubContract.sol')

contract('EthicHubBase', function (accounts) {
    beforeEach(async function () {
        await advanceBlock();
        this.mockStorage = await MockStorage.new();
    });

    describe('Storage setting', function() {
        it('should set correct address', async function() {
            const ethicHubContract = await MockEthicHubContract.new(this.mockStorage.address,1);
            const storageAddress = await ethicHubContract.getStorageAddress();
            storageAddress.should.be.equal(this.mockStorage.address);
        });

        it.only('should set correct version', async function() {
            const ethicHubContract = await MockEthicHubContract.new(this.mockStorage.address,3);
            const version = await ethicHubContract.version();
            version.should.be.bignumber.equal(3);
        });
    });
});
