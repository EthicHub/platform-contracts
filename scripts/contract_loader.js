'use-strict';
var temp = require("temp").track();
const path = require('path');

module.exports =  {
    load: async function(web3, contractName, deployedAddress ) {


        const jsonPath = path.join(__dirname,`../build/contracts/${contractName}.json`);
        const contract_data = require(jsonPath);
        if (contract_data === undefined) {
            throw Error(`No contract named ${contractName} in ${jsonPath}`);
        }
        if (deployedAddress === undefined) {
            const netId = await web3.eth.net.getId();
            deployedAddress = contract_data.networks[netId].address;

        }
        if (deployedAddress === undefined) {
            throw Error(`${contractName} does not have a deployed address in network ${netId}`);
        }
        return new web3.eth.Contract(contract_data.abi, deployedAddress, {
            data: contract_data.bytecode
        });

    },

    getContractWrapper: function(web3, contractName) {
        const jsonPath = path.join(__dirname,`../build/contracts/${contractName}.json`);
        const contract_data = require(jsonPath);
        if (contract_data === undefined) {
            throw Error(`No contract named ${contractName} in ${jsonPath}`);
        }
        return new web3.eth.Contract(contract_data.abi, {
            data: contract_data.bytecode
        });
    },

    getDeployable: function(web3, contractName) {

        const jsonPath = path.join(__dirname,`../build/contracts/${contractName}.json`);
        const contract_data = require(jsonPath);
        if (contract_data === undefined) {
            throw Error(`No contract named ${contractName} in ${jsonPath}`);
        }
        return {
            contract: new web3.eth.Contract(contract_data.abi),
            byteCode: contract_data.bytecode
        }

    }
};
