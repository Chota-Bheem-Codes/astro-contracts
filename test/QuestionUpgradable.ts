import { expect, use } from "chai";
import { upgrades, ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { deployContract, MockProvider, solidity } from "ethereum-waffle";
import AstroToken from "../artifacts/contracts/AstroTest.sol/AstroToken.json";
import GameQuestion from "../artifacts/contracts/GameQuestion.sol/GameQuestion.json";

use(solidity);

describe("Upgradable question ", () => {
  //const [owner, admin, operator, user, user1, user2] = new MockProvider().getWallets();
  let owner;
  let admin;
  let operator;
  let user;
  let user1;
  let user2;
  before(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    admin = signers[1];
    operator = signers[2];
    user = signers[3];
    user1 = signers[4];
    user2 = signers[5];
  });

  let astroTokenContract;
  let astroToken: Contract;
  let gameQuestionContract;
  let gameQuestion: Contract;

  const encodedGameId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("G1Q1"));
  //console.log(encodedGameId)
  beforeEach(async () => {
    //astroToken = await deployContract(user, DfynToken, [3000]);
    astroTokenContract = await ethers.getContractFactory("AstroToken");
    astroToken = await astroTokenContract.connect(user).deploy(3000);
    //   gameQuestion = await deployContract(owner, GameQuestion, [
    //     admin.address,
    //     operator.address,
    //     astroToken.address,
    //     encodedGameId,
    //     3,
    //     1632049420,
    //     1632222220,
    //   ]);

    gameQuestionContract = await ethers.getContractFactory("GameQuestion");

    const params = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
      [3, 1633080841, 1634014043, 90, 10, astroToken.address, encodedGameId],
    );
    gameQuestion = await upgrades.deployProxy(gameQuestionContract, [params, admin.address, operator.address], {
      kind: "uups",
    });
    await gameQuestion.deployed();

    await astroToken.transfer(user1.address, 1000, { from: user.address });
    await astroToken.transfer(user2.address, 1000, { from: user.address });

    await astroToken.approve(gameQuestion.address, 1000, { from: user.address });
    await astroToken.connect(user1).approve(gameQuestion.address, 1000);
    await astroToken.connect(user2).approve(gameQuestion.address, 1000);
  });

  // it("Assigns initial balance", async () => {
  //   expect(await astroToken.balanceOf(user.address)).to.equal(1000);
  // });

  // it("Able to place bet", async () => {
  //   await gameQuestion.connect(user).placeBet(100, 0);
  //   await expect(gameQuestion.connect(user).placeBet(100, 1)).to.be.revertedWith("only bet once");
  // });

  // it("Able to claim if won", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(owner).executeQuestion(0);
  //   await gameQuestion.connect(user).claim(user.address);
  //   expect(await astroToken.balanceOf(user.address)).to.equal(1000);
  // });

  // it("Able to claim full amount if game is cancelled", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(owner).executeQuestion(2);
  //   await gameQuestion.connect(user).claim(user.address);
  //   expect(await astroToken.balanceOf(user.address)).to.equal(1000);
  // });

  // it("should NOT be able to claim if lost", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(owner).executeQuestion(1);
  //   await expect(gameQuestion.connect(user).claim(user.address)).to.be.revertedWith("Not eligible for claim");
  // });

  // it("should NOT be able to bet if betting closed", async () => {
  //   await gameQuestion.connect(owner).executeQuestion(1);
  //   await expect(gameQuestion.connect(user).placeBet(10, 0)).to.be.revertedWith("Betting should be open");
  // });

  // it("should NOT be able to bet if betting timed out", async () => {
  //   await expect(gameQuestion.connect(user).placeBet(10, 0)).to.be.revertedWith("Betting should be open");
  // });

  // it("should NOT be able to bet if option is invalid", async () => {
  //   await expect(gameQuestion.connect(user).placeBet(10, 3)).to.be.revertedWith("Invalid Option");
  // });

  // it("should NOT be able to bet if bet amount is less than min bet amount", async () => {
  //   await expect(gameQuestion.connect(user).placeBet(1, 1)).to.be.revertedWith(
  //     "Bet amount must be greater than minBetAmount",
  //   );
  // });

  // it("should be able to claim full amount if no bets on other side", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(owner).executeQuestion(0);
  //   await gameQuestion.connect(user).claim(user.address);
  //   expect(await astroToken.balanceOf(user.address)).to.equal(1000);
  // });

  // it("Bet option A 2x multiuser", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(user1).placeBet(10, 1);
  //   await gameQuestion.connect(user2).placeBet(10, 1);
  //   await gameQuestion.connect(owner).executeQuestion(0);
  //   await gameQuestion.connect(user).claim(user.address);
  //   expect(await astroToken.balanceOf(user.address)).to.equal(1017);
  // });

  // it("Not able to claim twice", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(user1).placeBet(10, 1);
  //   await gameQuestion.connect(user2).placeBet(10, 1);
  //   await gameQuestion.connect(owner).executeQuestion(0);
  //   await gameQuestion.connect(user).claim(user.address);
  //   await expect(gameQuestion.connect(user).claim(user.address)).to.be.revertedWith("Rewards claimed");
  // });

  // it("Able to claim treasury", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(user1).placeBet(10, 1);
  //   await gameQuestion.connect(user2).placeBet(10, 1);
  //   await gameQuestion.connect(owner).executeQuestion(0);
  //   await gameQuestion.connect(user).claim(user.address);
  //   await gameQuestion.connect(owner).claimTreasury();
  //   expect(await astroToken.balanceOf(admin.address)).to.equal(3);
  // });

  // it("NOT Able to claim treasury if game has not ended", async () => {
  //   await gameQuestion.connect(user).placeBet(10, 0);
  //   await gameQuestion.connect(user1).placeBet(10, 1);
  //   await gameQuestion.connect(user2).placeBet(10, 1);
  //   await expect(gameQuestion.connect(owner).claimTreasury()).to.be.revertedWith("Game not ended");
  // });

  // it("Able to see user info", async () => {
  //   await gameQuestion.connect(user).placeBet(100, 1);
  //   console.log(await gameQuestion.connect(user).seeUserInfo(user.address));
  // });

  // it("user info if he has not taken the bet", async () => {
  //   console.log(await gameQuestion.connect(user).seeUserInfo(user.address));
  // });
});
