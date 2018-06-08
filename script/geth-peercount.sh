#!/bin/bash
#
#    Script that output peers of node geth.
#
#    Copyright (C) BokkyPooBah 2016. Update the script by EthiHub.
#
#    This file is part of EthicHub platform.
#
#    This is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# ------------------------------------------------------------------------------
# Check peers
#
# Works on Linux and OS/X. May work on Windows with Cygwin.
#
# Usage:
#   1. Download this script to checkBalance
#   2. `chmod 700 geth-peercount`
#   3. Run `geth console` in a window.
#   4. Then run this script `./geth-peercount` in a separate window.
#
# Parameters:
#   attach    Attach node parameter (rpc:http//ip:port or ipc:$HOME/geth.ipc)
#
# Sample Usage:
#   ./geth-peercount rpc:http//localhost:8545
#   7
#
# ------------------------------------------------------------------------------

# Leave ATTACHPARAMETER as undefined normally
# RPC
ATTACHPARAMETER=${1:-"rpc:http://localhost:8545"}
# OS/X IPC
# ATTACHPARAMETER="ipc:$HOME/Library/Ethereum/geth.ipc"

# echo "ATTACHPARAMETER: $ATTACHPARAMETER"

# Uncomment the following line and comment the next line using // while debugging this script
# geth attach $ATTACHPARAMETER << EOF
geth attach $ATTACHPARAMETER << EOF | grep "Node has peers: " | sed "s/Node has peers: //"

var peers=net.peerCount;
console.log("Node has peers: " + peers);

EOF
