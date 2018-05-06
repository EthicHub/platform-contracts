/*
    Smart contract of user status.

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
pragma solidity ^0.4.23;

import '../ownership/Ownable.sol';
import '../EthicHubBase.sol';
import '../reputation/EthicHubReputation.sol';

/* @title User
@dev This is an extension to add user
*/
contract EthicHubUser is Ownable, EthicHubBase {


    event UserStatusChanged(address target, string profile, bool isRegistered);

    constructor(address _storageAddress)
        EthicHubBase(_storageAddress)
        public
    {
        // Version
        version = 1;
    }

    /**
     * @dev Changes registration status of an address for participation.
     * @param target Address that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of address.
     */
    function changeUserStatus(address target, string profile, bool isRegistered)
        public
        onlyOwner
    {
        ethicHubStorage.setBool(keccak256("user", profile, target), isRegistered);
        emit UserStatusChanged(target, profile, isRegistered);
    }

    /**
     * @dev Changes registration statuses of addresses for participation.
     * @param targets Addresses that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of addresses.
     */
    function changeUsersStatus(address[] targets, string profile, bool isRegistered)
        external
        onlyOwner
    {
        for (uint i = 0; i < targets.length; i++) {
            changeUserStatus(targets[i], profile, isRegistered);
        }
    }

    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address for a specific profile.
     */
    function viewRegistrationStatus(address target, string profile)
        view public
        returns(bool isRegistered)
    {
        isRegistered = ethicHubStorage.getBool(keccak256("user", profile, target));
    }

    /**
     * @dev register a localNode address.
     */
    function registerLocalNode(address target)
        external
        onlyOwner
    {
        bool isRegistered = ethicHubStorage.getBool(keccak256("user", "localNode", target));
        if (!isRegistered) {
            ethicHubStorage.setBool(keccak256("user", "localNode", target), true);
            EthicHubReputation rep = EthicHubReputation(ethicHubStorage.getAddress(keccak256("contract.name", "reputation")));
            rep.initLocalNodeReputation(target);
        }
    }

    /**
     * @dev register a community address.
     */
    function registerCommunity(address target)
        external
        onlyOwner
    {
        bool isRegistered = ethicHubStorage.getBool(keccak256("user", "community", target));
        if (!isRegistered) {
            ethicHubStorage.setBool(keccak256("user", "community", target), true);
            EthicHubReputation rep = EthicHubReputation(ethicHubStorage.getAddress(keccak256("contract.name", "reputation")));
            rep.initCommunityReputation(target);
        }
    }


}
