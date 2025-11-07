// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReverseString {
    function reverseString(
        string memory _str
    ) public pure returns (string memory) {
        bytes memory strBytes = bytes(_str);
        uint strLen = strBytes.length;
        bytes memory reversed = new bytes(strLen);

        for (uint i = 0; i < strLen; i++) {
            reversed[i] = strBytes[strLen - i - 1];
        }

        return string(reversed);
    }
}
