/*
    Test integration of the platform contracts.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
'use strict';
const EthereumTx = require('ethereumjs-tx');
const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const lending = artifacts.require('./lending/EthicHubLending.sol');
// Default key pairs made by testrpc when using `truffle develop` CLI tool
// NEVER USE THESE KEYS OUTSIDE OF THE LOCAL TEST ENVIRONMENT
const privateKeys = [
  'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
  'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
  '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
  'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c'
];

function now() {
  return Math.round((new Date()).getTime() / 1000);
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
};

function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'))
}


async function deployContracts (deployer, network, accounts) {

    const instances = await Promise.all([
        storage.deployed(),
        userManager.deployed(storage.address)
    ]);
    return instances;
    //const storageInstance = instances[0];
    //const userManagerInstance = instances[1];
}

// "registro de un investor" "registro de un local node", "registro de comunidad"
contract('EthicHubUser', function(accounts) {
  let instances;
  let storageInstance;
  let userManagerInstance;
  //let lendingInstance;
  let ownerUserManager;
  let ownerLending;
  let web3Contract;
  const localNode = accounts[1];
  const community = accounts[2];
  const teamEH = accounts[3];
  before(async () => {
    //instances = await Promise.all([
    //    storage.deployed(),
    //    userManager.deployed(storage.address),
    //    deployer.deployed(
    //      lending,
    //      now() + duration.minutes(5),//fundingStartTime
    //      now() + duration.minutes(35),//fundingEndTime
    //      community,//borrower (community)
    //      115,//lendingInterestRatePercentage
    //      ether(3),//totalLendingAmount
    //      2,//lendingDays
    //      storage.address, //storageAddress
    //      localNode,//localNode
    //      teamEH//team
    //  )
    //]);
    instances = await deployContracts();
    storageInstance = instances[0];
    userManagerInstance = instances[1];
    //lendingInstance = instances[2];
    //storageInstance = await storage.deployed();
    //userManagerInstance = await userManager.deployed(storageInstance.address);
    web3Contract = web3.eth.contract(userManagerInstance.abi).at(userManagerInstance.address);
    ownerUserManager = web3Contract._eth.coinbase;
    //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
    //ownerLending = web3Contract._eth.coinbase;
  });
  it('should pass if contracts are deployed', async function() {
    let userManagerContractName = await userManagerInstance.name.call();
    //let lendingContractName = await lendingInstance.name.call();
    userManagerContractName.should.be.equal('EthicHubUser');
    //lendingContractName.should.be.equal('EthicHubLending');
  });
  it('should register local node', async function() {
    await userManagerInstance.registerLocalNode(localNode);
    let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode, 'localNode');
    registrationStatus.should.be.equal(true);
  });
  it('should register community', async function() {
    await userManagerInstance.registerCommunity(community);
    let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
    registrationStatus.should.be.equal(true);
  });
});
/*
 * Call a smart contract function from any keyset in which the caller has the
 *     private and public keys.
 * @param {string} senderPublicKey Public key in key pair.
 * @param {string} senderPrivateKey Private key in key pair.
 * @param {string} contractAddress Address of Solidity contract.
 * @param {string} data Data from the function's `getData` in web3.js.
 * @param {number} value Number of Ethereum wei sent in the transaction.
 * @return {Promise}
 */
function rawTransaction(
  senderPublicKey,
  senderPrivateKey,
  contractAddress,
  data,
  value
) {
  return new Promise((resolve, reject) => {
    let key = new Buffer(senderPrivateKey, 'hex');
    let nonce = web3.toHex(web3.eth.getTransactionCount(senderPublicKey));
    let gasPrice = web3.eth.gasPrice;
    let gasPriceHex = web3.toHex(web3.eth.estimateGas({
      from: contractAddress
    }));
    let gasLimitHex = web3.toHex(5500000);
    let rawTx = {
        nonce: nonce,
        gasPrice: gasPriceHex,
        gasLimit: gasLimitHex,
        data: data,
        to: contractAddress,
        value: web3.toHex(value)
    };
    let tx = new EthereumTx(rawTx);
    tx.sign(key);
    let stx = '0x' + tx.serialize().toString('hex');
    web3.eth.sendRawTransaction(stx, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
}
