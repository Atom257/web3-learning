// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MergeSortedArray {
    function mergeSortedArray(
        int[] memory arr1,
        int[] memory arr2
    ) public pure returns (int[] memory result) {
        uint len1 = arr1.length;
        uint len2 = arr2.length;

        uint i;
        uint j;
        uint k;

        result = new int[](arr1.length + arr2.length);

        while (i < len1 && j < len2) {
            if (arr1[i] <= arr2[j]) {
                result[k++] = arr1[i++];
            } else {
                result[k++] = arr2[j++];
            }
        }

        //剩余元素追加
        while (i < len1) result[k++] = arr1[i++];
        while (j < len2) result[k++] = arr2[j++];
        return result;
    }
}
