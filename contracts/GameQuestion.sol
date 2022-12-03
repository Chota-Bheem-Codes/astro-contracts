// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./libraries/NativeMetaTransaction/PausableUpgradable.sol";
import "./libraries/NativeMetaTransaction/OwnableUpgradable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract GameQuestion is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradable,
    PausableUpgradable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    enum Position {
        A,
        B,
        C
    }

    struct Question {
        uint256 startTime;
        uint256 lockTime;
        uint256 totalAmount;
        uint256 betAmountA;
        uint256 betAmountB;
        uint256 rewardAmount;
        uint256 rewardBaseCalAmount;
        Position answer;
        bool isGameEnded;
    }

    struct BetInfo {
        Position position;
        uint256 amount;
        bool claimed;
    }

    Question public question;
    mapping(address => BetInfo) public ledger;
    address public adminAddress;
    address public operatorAddress;
    bytes32 public questionID;
    uint256 public treasuryAmount;
    uint256 public minBetAmount;
    uint8 public constant TOTAL_RATE = 100; // 100%
    uint8 public rewardRate; // 90%
    uint8 public treasuryRate; // 10%
    IERC20Upgradeable public gameToken;

    event PlaceBetA(address indexed sender, bytes32 indexed questionID, uint256 amount);
    event PlaceBetB(address indexed sender, bytes32 indexed questionID, uint256 amount);
    event Claim(address indexed sender, bytes32 indexed questionID, uint256 amount);
    event ClaimTreasury(bytes32 indexed questionID, uint256 amount);
    event AnswerSet(bytes32 indexed questionID, uint8 option);
    event RatesUpdated(bytes32 indexed questionID, uint256 rewardRate, uint256 treasuryRate);
    event MinBetAmountUpdated(bytes32 indexed questionID, uint256 minBetAmount);
    event RewardsCalculated(
        bytes32 indexed questionID,
        uint256 rewardBaseCalAmount,
        uint256 rewardAmount,
        uint256 treasuryAmount
    );
    event SetAdmin(address indexed adminAddress, bytes32 indexed questionID);
    event SetOperator(address indexed operatorAddress, bytes32 indexed questionID);
    event Pause(bytes32 indexed questionID);
    event Unpause(bytes32 indexed questionID);

    function initialize(
        bytes memory data,
        address _adminAddress,
        address _operatorAddress
    ) external initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        uint256 _minBetAmount;
        uint256 _startTime;
        uint256 _lockTime;
        uint8 _rewardRate;
        uint8 _treasuryRate;
        address _gameToken;
        bytes32 _questionID;
        (_minBetAmount, _startTime, _lockTime, _rewardRate, _treasuryRate, _gameToken, _questionID) = abi.decode(
            data,
            (uint256, uint256, uint256, uint8, uint8, address, bytes32)
        );
        require(_startTime < _lockTime, "GameQuestion: _startTime should be less than _lockTime");
        adminAddress = _adminAddress;
        operatorAddress = _operatorAddress;
        gameToken = IERC20Upgradeable(_gameToken);
        questionID = _questionID;
        minBetAmount = _minBetAmount;
        question.startTime = _startTime;
        question.lockTime = _lockTime;
        rewardRate = _rewardRate;
        treasuryRate = _treasuryRate;
    }

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "admin: wut?");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operatorAddress, "operator: wut?");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || msg.sender == adminAddress, "owner | admin: wut?");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev set admin address
     * callable by owner
     */

    function setAdmin(address _adminAddress) external onlyAdmin {
        require(_adminAddress != address(0), "Cannot be zero address");
        adminAddress = _adminAddress;
        emit SetAdmin(adminAddress, questionID);
    }

    /**
     * @dev set operator address
     * callable by admin
     */
    function setOperator(address _operatorAddress) external onlyAdmin {
        require(_operatorAddress != address(0), "Cannot be zero address");
        operatorAddress = _operatorAddress;
        emit SetOperator(operatorAddress, questionID);
    }

    function setRewardRate(uint8 _rewardRate) external onlyAdmin {
        require(_rewardRate <= TOTAL_RATE, "rewardRate cannot be more than 100%");
        rewardRate = _rewardRate;
        treasuryRate = TOTAL_RATE - _rewardRate;
        emit RatesUpdated(questionID, rewardRate, treasuryRate);
    }

    /**
     * @dev set treasury rate
     * callable by admin
     */
    function setTreasuryRate(uint8 _treasuryRate) external onlyAdmin {
        require(_treasuryRate <= TOTAL_RATE, "treasuryRate cannot be more than 100%");
        rewardRate = TOTAL_RATE - _treasuryRate;
        treasuryRate = _treasuryRate;
        emit RatesUpdated(questionID, rewardRate, treasuryRate);
    }

    /**
     * @dev set minBetAmount
     * callable by admin
     */
    function setMinBetAmount(uint256 _minBetAmount) external onlyAdmin {
        minBetAmount = _minBetAmount;
        emit MinBetAmountUpdated(questionID, minBetAmount);
    }

    function placeBet(bytes memory data, address userAddress) external onlyOwner whenNotPaused nonReentrant {
        //Option to be A or B
        uint256 amount;
        uint8 option;
        (amount, option) = abi.decode(data, (uint256, uint8));
        require(option == 0 || option == 1, "Invalid Option");
        //betting should be open
        require(_bettable() && !question.isGameEnded, "Betting should be open");
        //amount >= minBetAmount
        require(amount >= minBetAmount, "Bet amount must be greater than minBetAmount");
        //can only bet once
        require(ledger[userAddress].amount == 0, "only bet once");

        question.totalAmount += amount;
        BetInfo storage betInfo = ledger[userAddress];

        if (option == 0) {
            question.betAmountA += amount;
            betInfo.position = Position.A;
            emit PlaceBetA(userAddress, questionID, amount);
        } else {
            question.betAmountB += amount;
            betInfo.position = Position.B;
            emit PlaceBetB(userAddress, questionID, amount);
        }

        betInfo.amount = amount;

        gameToken.safeTransferFrom(userAddress, address(this), amount);
    }

    function _setAnswer(uint8 option) internal {
        require(option == 0 || option == 1 || option == 2, "Invalid Option");
        if (option == 0) {
            question.answer = Position.A;
        } else if (option == 1) {
            question.answer = Position.B;
        } else if (option == 2) {
            question.answer = Position.C;
        }
        question.isGameEnded = true;
        emit AnswerSet(questionID, option);
    }

    function _calculateRewards() internal {
        require(rewardRate + treasuryRate == TOTAL_RATE, "rewardRate and treasuryRate must add up to TOTAL_RATE");
        require(question.rewardBaseCalAmount == 0 && question.rewardAmount == 0, "Rewards calculated");

        uint256 rewardBaseCalAmount;
        uint256 rewardAmount;
        uint256 treasuryAmt;
        // Side A
        if (question.answer == Position.A) {
            if (question.betAmountB == 0) {
                rewardBaseCalAmount = question.betAmountA;
                rewardAmount = question.totalAmount;
                treasuryAmt = 0;
            } else if (question.betAmountA == 0) {
                rewardBaseCalAmount = 0;
                rewardAmount = 0;
                treasuryAmt = question.totalAmount;
            } else {
                rewardBaseCalAmount = question.betAmountA;
                rewardAmount = (question.totalAmount * rewardRate) / (TOTAL_RATE);
                treasuryAmt = (question.totalAmount * treasuryRate) / (TOTAL_RATE);
            }
        }
        // Side B
        else if (question.answer == Position.B) {
            if (question.betAmountA == 0) {
                rewardBaseCalAmount = question.betAmountB;
                rewardAmount = question.totalAmount;
                treasuryAmt = 0;
            } else if (question.betAmountB == 0) {
                rewardBaseCalAmount = 0;
                rewardAmount = 0;
                treasuryAmt = question.totalAmount;
            } else {
                rewardBaseCalAmount = question.betAmountB;
                rewardAmount = (question.totalAmount * rewardRate) / (TOTAL_RATE);
                treasuryAmt = (question.totalAmount * treasuryRate) / (TOTAL_RATE);
            }
        }
        // Match Draw   / Side C
        else {
            rewardBaseCalAmount = 0;
            rewardAmount = 0;
            treasuryAmt = 0; //question.totalAmount;
        }
        question.rewardBaseCalAmount = rewardBaseCalAmount;
        question.rewardAmount = rewardAmount;

        // Add to treasury
        treasuryAmount = treasuryAmount + treasuryAmt;

        emit RewardsCalculated(questionID, rewardBaseCalAmount, rewardAmount, treasuryAmount);
    }

    function executeQuestion(uint8 option) external onlyOperator whenNotPaused {
        require(!question.isGameEnded, "Question already executed");
        _setAnswer(option);
        _calculateRewards();
    }

    function claim(address userAddress) external onlyOwner whenNotPaused nonReentrant {
        require(question.isGameEnded, "Game has not ended");
        require(ledger[userAddress].amount != 0, "Bet amount 0");
        require(!ledger[userAddress].claimed, "Rewards claimed");

        uint256 reward;

        // questn valid, claim rewards
        if (question.answer == Position.A || question.answer == Position.B) {
            require(claimable(userAddress), "Not eligible for claim");
            reward = (ledger[userAddress].amount * question.rewardAmount) / (question.rewardBaseCalAmount);
        }
        // questn invalid, refund bet amount
        else {
            require(refundable(userAddress), "Not eligible for refund");
            reward = ledger[userAddress].amount;
        }

        BetInfo storage betInfo = ledger[userAddress];
        betInfo.claimed = true;
        gameToken.safeTransfer(address(userAddress), reward);
        emit Claim(userAddress, questionID, reward);
    }

    function claimTreasury() external onlyOwnerOrAdmin {
        require(question.isGameEnded, "Game not ended");
        uint256 currentTreasuryAmount = treasuryAmount;
        treasuryAmount = 0;
        gameToken.safeTransfer(adminAddress, currentTreasuryAmount);
        emit ClaimTreasury(questionID, currentTreasuryAmount);
    }

    function seeUserInfo(address user)
        external
        view
        returns (
            Position position,
            uint256 amount,
            bool claimed
        )
    {
        position = ledger[user].position;
        amount = ledger[user].amount;
        claimed = ledger[user].claimed;
    }

    function refundable(address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[user];

        return question.answer == Position.C && betInfo.amount != 0;
    }

    function claimable(address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[user];
        return
            question.isGameEnded &&
            ((question.answer == Position.A && betInfo.position == Position.A) ||
                (question.answer == Position.B && betInfo.position == Position.B));
    }

    function pause() external onlyAdmin whenNotPaused {
        _pause();
        emit Pause(questionID);
    }

    function unpause() external onlyAdmin whenPaused {
        _unpause();
        emit Unpause(questionID);
    }

    function _bettable() internal view returns (bool) {
        return
            question.startTime != 0 &&
            question.lockTime != 0 &&
            block.timestamp > question.startTime &&
            block.timestamp < question.lockTime;
    }
}
