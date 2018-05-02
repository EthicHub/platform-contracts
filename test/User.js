/*
    Test of smart contract of a Whitelisted Accounts.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
import ether from './helpers/ether' 
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'
const web3_1_0 = require('web3');
const utils = web3_1_0.utils;
const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const User = artifacts.require('User');
const Storage = artifacts.require('EthicHubStorage');
const EthicHubCMC = artifacts.require('EthicHubCMC');

contract('User', function (whitelisted_accounts) {

    const owner = whitelisted_accounts.pop();
    const test_account = whitelisted_accounts.pop();

    
    describe('whitelisted accounts', function() {
      var account = 0;
      var is_registered = false;

    beforeEach(async function () {
      await advanceBlock();
      this.storage = await Storage.new();
      this.cmc = await EthicHubCMC.new(this.storage.address) 
      this.start = latestTime() + duration.minutes(2); // +2 minute so it starts after contract instantiation
      this.end = this.start + duration.days(40);
      await this.storage.setAddress(utils.soliditySha3("contract.address", this.cmc.address), this.cmc.address)
      await this.storage.setAddress(utils.soliditySha3("contract.name", 'cmc'), this.cmc.address)
      this.users = await User.new(this.storage.address, {from:owner})
      await this.cmc.upgradeContract(this.users.address, 'whitelist')
    });

      it('change status of registered account (true->false)', async function () {
          var i = Math.floor(Math.random() * whitelisted_accounts.length);
          await this.users.changeUserStatus(whitelisted_accounts[i], true, {from:owner}).should.be.fulfilled;
          account = whitelisted_accounts[i];
          is_registered = await this.users.viewRegistrationStatus(account);
          is_registered.should.be.equal(true);
          await this.users.changeUserStatus(account, false, {from:owner}).should.be.fulfilled;
          is_registered = await this.users.viewRegistrationStatus(account);
          is_registered.should.be.equal(false);
      });
      it('change status for list of registered accounts (true->false)', async function () {
          await this.users.changeUsersStatus(whitelisted_accounts, false, {from:owner}).should.be.fulfilled;
          for (var i = 0; i < whitelisted_accounts.length; i++) {
              account = whitelisted_accounts[i];
              is_registered = await this.users.viewRegistrationStatus(account);
              is_registered.should.be.equal(false);
          }
      });

      it('add registered test account (true)', async function () {
          await this.users.changeUserStatus(test_account, true, {from:owner}).should.be.fulfilled;
          is_registered = await this.users.viewRegistrationStatus(test_account);
          is_registered.should.be.equal(true);
      });

      it('view two registered accounts: whitelisted all false and test true', async function () {
          await this.users.changeUsersStatus(whitelisted_accounts, false, {from:owner}).should.be.fulfilled;
          var i = Math.floor(Math.random() * whitelisted_accounts.length);
          is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[i]);
          is_registered.should.be.equal(false);
          await this.users.changeUserStatus(test_account, true, {from:owner}).should.be.fulfilled;
          is_registered = await this.users.viewRegistrationStatus(test_account);
          is_registered.should.be.equal(true);
      });

    });

});
