// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IntToRoman {
    //节省gas使用memory 中的bytes。不用storage中的动态bytes。
    function intToRoman(uint _num) public pure returns (string memory) {
        require(_num > 0 && _num <= 3999, "Out of range");
        //根据要求创建缓存
        bytes memory romanTemp = new bytes(64);
        //循环中记录罗马字数，用于最后拼接
        uint romanLen = 0;

        while (_num > 0) {
            if (_num >= 1000) {
                _num -= 1000;
                romanTemp[romanLen++] = "M";
            } else if (_num >= 900) {
                _num -= 900;
                romanTemp[romanLen++] = "C";
                romanTemp[romanLen++] = "M";
            } else if (_num >= 500) {
                _num -= 500;
                romanTemp[romanLen++] = "D";
            } else if (_num >= 400) {
                _num -= 400;
                romanTemp[romanLen++] = "C";
                romanTemp[romanLen++] = "D";
            } else if (_num >= 100) {
                _num -= 100;
                romanTemp[romanLen++] = "C";
            } else if (_num >= 90) {
                _num -= 90;
                romanTemp[romanLen++] = "X";
                romanTemp[romanLen++] = "C";
            } else if (_num >= 50) {
                _num -= 50;
                romanTemp[romanLen++] = "L";
            } else if (_num >= 40) {
                _num -= 40;
                romanTemp[romanLen++] = "X";
                romanTemp[romanLen++] = "L";
            } else if (_num >= 10) {
                _num -= 10;
                romanTemp[romanLen++] = "X";
            } else if (_num >= 9) {
                _num -= 9;
                romanTemp[romanLen++] = "I";
                romanTemp[romanLen++] = "X";
            } else if (_num >= 5) {
                _num -= 5;
                romanTemp[romanLen++] = "V";
            } else if (_num >= 4) {
                _num -= 4;
                romanTemp[romanLen++] = "I";
                romanTemp[romanLen++] = "V";
            } else {
                _num -= 1;
                romanTemp[romanLen++] = "I";
            }
        }

        //截取有效长度
        bytes memory result = new bytes(romanLen);
        for (uint i; i < romanLen; i++) {
            result[i] = romanTemp[i];
        }

        return string(result);
    }
    //测试函数：执行所有示例
    function testExamples() public pure returns (string[5] memory results) {
        results[0] = intToRoman(3); // "III"
        results[1] = intToRoman(4); // "IV"
        results[2] = intToRoman(9); // "IX"
        results[3] = intToRoman(58); // "LVIII"
        results[4] = intToRoman(1994); // "MCMXCIV"
    }
}
