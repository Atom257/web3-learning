// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Strings.sol";

contract Voting {
    using Strings for uint256;
    //记录每个候选人的得票数
    mapping(uint => uint) private votes;

    //存储所有出现过的候选人ID
    uint[] private candidateIds;

    mapping(uint => bool) private candidateExists;

    function vote(uint candidateId) public {
        // 如果是第一次投这个候选人，则记录他的ID
        if (!candidateExists[candidateId]) {
            candidateExists[candidateId] = true;
            candidateIds.push(candidateId);
        }
        votes[candidateId] += 1;
    }

    //返回某个候选人的得票数
    function getVotes(uint _voter) public view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "voter:",
                    _voter.toString(),
                    " ; vote num:",
                    votes[_voter].toString()
                )
            );
    }

    //返回所有候选人的得票数
    function getAllVotes() public view returns (uint[] memory, uint[] memory) {
        uint len = candidateIds.length;
        uint[] memory ids = new uint[](len);
        uint[] memory votesNum = new uint[](len);
        for (uint i = 0; i < len; i++) {
            ids[i] = candidateIds[i];
            votesNum[i] = votes[candidateIds[i]];
        }
        return (ids, votesNum);
    }

    //重置所有候选人的得票数
    function resetVotes() public {
        for (uint i; i < (candidateIds.length); i++) {
            delete votes[candidateIds[i]];
        }
    }
}
