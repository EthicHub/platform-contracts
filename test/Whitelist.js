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

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const Whitelist = artifacts.require('Whitelist');

contract('Whitelist', function (whitelisted_accounts) {

    const owner = whitelisted_accounts.pop();
    const test_account = whitelisted_accounts.pop();

    beforeEach(async function () {
      await advanceBlock();
      this.start = latestTime() + duration.minutes(2); // +2 minute so it starts after contract instantiation
      this.end = this.start + duration.days(40);
    });

    describe('whitelisted accounts', function() {
      var account = 0;
      var is_registered = false;

      it('initialize whitelist accounts (true)', async function () {
          this.whitelisted_accounts = await Whitelist.new(whitelisted_accounts, {from:owner}).should.be.fulfilled;
      });

      it('change status of registered account (true->false)', async function () {
          var i = Math.floor(Math.random() * whitelisted_accounts.length);
          account = whitelisted_accounts[i];
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
          is_registered.should.be.equal(true);
          await this.whitelisted_accounts.changeRegistrationStatus(account, false, {from:owner}).should.be.fulfilled;
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
          is_registered.should.be.equal(false);
      });

      it('change status for list of registered accounts (true->false)', async function () {
          await this.whitelisted_accounts.changeRegistrationStatuses(whitelisted_accounts, false, {from:owner}).should.be.fulfilled;
          for (var i = 0; i < whitelisted_accounts.length; i++) {
              account = whitelisted_accounts[i];
              is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
              is_registered.should.be.equal(false);
          }
      });

      it('add registered test account (true)', async function () {
          await this.whitelisted_accounts.changeRegistrationStatus(test_account, true, {from:owner}).should.be.fulfilled;
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(test_account);
          is_registered.should.be.equal(true);
      });

      it('view two registered accounts: whitelisted all false and test true', async function () {
          var i = Math.floor(Math.random() * whitelisted_accounts.length);
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(whitelisted_accounts[i]);
          is_registered.should.be.equal(false);
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(test_account);
          is_registered.should.be.equal(true);
      });

    });

});
