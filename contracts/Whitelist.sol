/*
    Smart contract of a Whitelist.

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
pragma solidity ^0.4.21;

import './ownership/Ownable.sol';

/* @title Whitelist
@dev This is an extension to add whitelist to a crowdsale
*/
contract Whitelist is Ownable {

    mapping(address=>bool) public registered;

    event RegistrationStatusChanged(address target, bool isRegistered);

    function Whitelist(address[] _whitelisted_accounts)
        public
        onlyOwner
    {
        changeRegistrationStatuses(_whitelisted_accounts, true);
    }

    /**
     * @dev Changes registration status of an address for participation.
     * @param target Address that will be registered/deregistered.
     * @param isRegistered New registration status of address.
     */
    function changeRegistrationStatus(address target, bool isRegistered)
        public
        onlyOwner
    {
        registered[target] = isRegistered;
        emit RegistrationStatusChanged(target, isRegistered);
    }

    /**
     * @dev Changes registration statuses of addresses for participation.
     * @param targets Addresses that will be registered/deregistered.
     * @param isRegistered New registration status of addresses.
     */
    function changeRegistrationStatuses(address[] targets, bool isRegistered)
        public
        onlyOwner
    {
        for (uint i = 0; i < targets.length; i++) {
            changeRegistrationStatus(targets[i], isRegistered);
        }
    }

    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address.
     */
    function viewRegistrationStatus(address target)
        view public
        returns(bool isRegistered)
    {
        isRegistered = registered[target];
    }

    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address.
     */
    function viewRegistrationStatuses(address[] targets)
        view public
    {
        for (uint i = 0; i < targets.length; i++) {
            viewRegistrationStatus(targets[i]);
        }
    }
}

