// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BinarySearch {
    function binarySearch(uint[] memory arr,uint target) public pure returns (int) {
        uint left = 0;
        uint right = arr.length-1;

        while(left <= right){
            uint midIdx = (left + right) /2;
            uint midVal = arr[midIdx];

            if(target == midVal){
                return int(midIdx);
            }else if(target > midVal){
                //分到右边
                left = midIdx+1;
            }else {
                //防止uint溢出
                if (midIdx == 0) break;
                // 左边 
                right = midIdx-1;
            }

        }

        return -1;
    }
}