// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RomanToInt {
    //映射 罗马数字，节省gas 不用mapping
    function romanValue(bytes1 c) private pure returns (uint) {
        if (c == "I") return 1;
        if (c == "V") return 5;
        if (c == "X") return 10;
        if (c == "L") return 50;
        if (c == "C") return 100;
        if (c == "D") return 500;
        if (c == "M") return 1000;
        return 0;
    }

    function romanToInteger(
        string memory _romanStr
    ) public pure returns (uint) {
        bytes memory strBytes = bytes(_romanStr);
        uint strLen = strBytes.length;
        uint romanInt = 0;

        for (uint idx; idx < strLen; idx++) {
            uint currentValue = romanValue(strBytes[idx]);
            uint nextValue = 0;

            // 防止越界
            if (idx + 1 < strLen) {
                nextValue = romanValue(strBytes[idx + 1]);
            }

            // 如果下一位比当前位大，而执行减法，并跳过下一位。否则执行加法
            if (nextValue > currentValue) {
                romanInt += (nextValue - currentValue);
                idx++; // 跳过下一个字符
            } else {
                romanInt += currentValue;
            }
        }

        return romanInt;
    }

    // 测试函数：执行所有示例
    function testExamples() public pure returns (uint[5] memory results) {
        results[0] = romanToInteger("III"); // 3
        results[1] = romanToInteger("IV"); // 4
        results[2] = romanToInteger("IX"); // 9
        results[3] = romanToInteger("LVIII"); // 58
        results[4] = romanToInteger("MCMXCIV"); // 1994
    }
}
