// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Crowdfunding is ReentrancyGuard {
    // =============================================================
    //                           ERRORS
    // =============================================================

    error CampaignNotFound();
    error InvalidGoal();
    error InvalidDeadline();
    error CampaignEnded();
    error ZeroContribution();
    error GoalNotReached();
    error GoalReached();
    error NotCampaignCreator();
    error TransferFailed();
    error AlreadyRefunded();
    error NothingToRefund();
    error NotFailed();
    error AlreadyWithdrawn();

    // =============================================================
    //                          STRUCTS
    // =============================================================

    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool withdrawn;
    }

    // =============================================================
    //                           STATE
    // =============================================================

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;

    mapping(uint256 => mapping(address => uint256)) public contributions;

    mapping(uint256 => mapping(address => bool)) public refunded;

    // =============================================================
    //                           EVENTS
    // =============================================================

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event CampaignWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    // =============================================================
    //                    CAMPAIGN CREATION
    // =============================================================

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goal,
        uint256 deadline
    ) external returns (uint256 campaignId) {
        if (goal == 0) {
            revert InvalidGoal();
        }

        if (deadline <= block.timestamp) {
            revert InvalidDeadline();
        }

        campaignId = campaignCount++;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            title: title,
            description: description,
            goal: goal,
            raised: 0,
            deadline: deadline,
            withdrawn: false
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            title,
            goal,
            deadline
        );
    }

    // =============================================================
    //                       CONTRIBUTIONS
    // =============================================================

    function contribute(uint256 campaignId) external payable {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        if (campaign.raised >= campaign.goal) {
            revert GoalReached();
        }

        if (block.timestamp >= campaign.deadline) {
            revert CampaignEnded();
        }

        if (msg.value == 0) {
            revert ZeroContribution();
        }

        campaign.raised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        emit ContributionReceived(
            campaignId,
            msg.sender,
            msg.value
        );
    }

    // =============================================================
    //                         WITHDRAWAL
    // =============================================================

    function withdraw(
        uint256 campaignId
    ) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        if (msg.sender != campaign.creator) {
            revert NotCampaignCreator();
        }

        if (campaign.raised < campaign.goal) {
            revert GoalNotReached();
        }

        if (campaign.withdrawn) {
            revert AlreadyWithdrawn();
        }

        campaign.withdrawn = true;

        uint256 amount = campaign.raised;

        (bool success, ) = payable(campaign.creator).call{
            value: amount
        }("");

        if (!success) {
            campaign.withdrawn = false;
            revert TransferFailed();
        }

        emit CampaignWithdrawn(
            campaignId,
            campaign.creator,
            amount
        );
    }

    // =============================================================
    //                           REFUNDS
    // =============================================================

    function refund(
        uint256 campaignId
    ) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        if (block.timestamp < campaign.deadline) {
            revert NotFailed();
        }

        if (campaign.raised >= campaign.goal) {
            revert GoalReached();
        }

        uint256 amount = contributions[campaignId][msg.sender];

        if (amount == 0) {
            revert NothingToRefund();
        }

        if (refunded[campaignId][msg.sender]) {
            revert AlreadyRefunded();
        }

        refunded[campaignId][msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{
            value: amount
        }("");

        if (!success) {
            refunded[campaignId][msg.sender] = false;
            revert TransferFailed();
        }

        emit RefundIssued(
            campaignId,
            msg.sender,
            amount
        );
    }

    // =============================================================
    //                           VIEW FUNCTIONS
    // =============================================================

    function getCampaign(
        uint256 campaignId
    ) external view returns (Campaign memory) {
        if (campaigns[campaignId].creator == address(0)) {
            revert CampaignNotFound();
        }

        return campaigns[campaignId];
    }

    function getContribution(
        uint256 campaignId,
        address contributor
    ) external view returns (uint256) {
        return contributions[campaignId][contributor];
    }

    function isSuccessful(
        uint256 campaignId
    ) external view returns (bool) {
        Campaign memory campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        return campaign.raised >= campaign.goal;
    }

    function isFailed(
        uint256 campaignId
    ) external view returns (bool) {
        Campaign memory campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        return (
            block.timestamp >= campaign.deadline &&
            campaign.raised < campaign.goal
        );
    }

    function getRemainingAmount(
        uint256 campaignId
    ) external view returns (uint256) {
        Campaign memory campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignNotFound();
        }

        if (campaign.raised >= campaign.goal) {
            return 0;
        }

        return campaign.goal - campaign.raised;
    }
}
