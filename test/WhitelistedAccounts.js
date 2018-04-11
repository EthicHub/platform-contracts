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


const WhitelistedAccounts = artifacts.require('WhitelistedAccounts');

contract('WhitelistedAccounts', function (whitelisted_accounts) {

    beforeEach(async function () {
      this.owner = whitelisted_accounts.pop()
      this.account = whitelisted_accounts.pop()
      await advanceBlock();
      this.start = latestTime() + duration.minutes(2); // +2 minute so it starts after contract instantiation
      this.end = this.start + duration.days(40);
      this.whitelisted_accounts = await WhitelistedAccounts.new(whitelisted_accounts, {from:this.owner});
    });

    describe('whitelisted accounts', function() {
      var account = 0;
      var is_registered = false;
      it('change status of registered account', async function () {
          account = whitelisted_accounts[0];
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
          is_registered.should.be.equal(true);
          await this.whitelisted_accounts.changeRegistrationStatus(account, false, {from:this.owner}).should.be.fulfilled;
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
          is_registered.should.be.equal(false);
      });

      it('change status for list of registered accounts', async function () {
          for (var i = 0; i < whitelisted_accounts.length; i++) {
              account = whitelisted_accounts[i];
              is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
              is_registered.should.be.equal(true);
          }
          await this.whitelisted_accounts.changeRegistrationStatuses(whitelisted_accounts, false, {from:this.owner}).should.be.fulfilled;
          for (var i = 0; i < this.whitelisted_accounts.length; i++) {
              account = whitelisted_accounts[i];
              is_registered = await this.whitelisted_accounts.viewRegistrationStatus(account);
              is_registered.should.be.equal(false);
          }
      });

      it('add registered account', async function () {
          await this.whitelisted_accounts.changeRegistrationStatus(this.account, true, {from:this.owner}).should.be.fulfilled;
          is_registered = await this.whitelisted_accounts.viewRegistrationStatus(this.account);
          is_registered.should.be.equal(true);
      });

      //it('view registered accounts', async function () {
      //    is_registered = await this.whitelisted_accounts.viewRegistrationStatus(this.account);
      //    is_registered.should.be.equal(true);
      //    is_registered = await this.whitelisted_accounts.viewRegistrationStatus(whitelisted_accounts[2]);
      //    is_registered.should.be.equal(false);
      //});

      //it('remove registered account', async function () {
      //    await this.whitelisted_accounts.changeRegistrationStatus(this.account, false, {from:this.owner}).should.be.fulfilled;
      //    var is_registered = await this.whitelisted_accounts.viewRegistrationStatus(this.account);
      //    is_registered.should.be.equal(true);
      //});
    });

});
