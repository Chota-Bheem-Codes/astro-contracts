import { expect, use } from "chai";
import { upgrades, ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { deployContract, MockProvider, solidity } from "ethereum-waffle";
import DfynToken from "../artifacts/contracts/DfynTest.sol/DfynToken.json";
import GameQuestion from "../artifacts/contracts/GameQuestion.sol/GameQuestion.json";

use(solidity);

const encodedID = (id: string) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(id));

describe("Factory Upgradable", () => {
  //const [owner, admin, operator, user] = new MockProvider().getWallets();
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

  let dfynTokenContract;
  let dfynToken;
  let questionFactoryContract;
  let questionFactory;
  let gameQuestionContract;
  let gameQuestionProxy;
  let gameQuestionImplementation;

  //console.log(encodedGameId)

  let data1;
  let data2;
  let data3;
  let data4;
  let data5;
  let questionData;
  let questionData2;

  beforeEach(async () => {
    dfynTokenContract = await ethers.getContractFactory("DfynToken");
    dfynToken = await dfynTokenContract.connect(user).deploy(4000);
    await dfynToken.transfer(user1.address, 1000, { from: user.address });
    await dfynToken.transfer(user2.address, 1000, { from: user.address });

    questionFactoryContract = await ethers.getContractFactory("Factory");
    questionFactory = await upgrades.deployProxy(questionFactoryContract, [admin.address, operator.address], {
      kind: "uups",
    });

    gameQuestionContract = await ethers.getContractFactory("GameQuestion");

    const params = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
      [3, 1632049420, 1635600093, 90, 10, dfynToken.address, encodedID("G1Q1")],
    );

    gameQuestionProxy = await upgrades.deployProxy(gameQuestionContract, [params, admin.address, operator.address]);
    await gameQuestionProxy.deployed();

    //Storing implemen
    gameQuestionImplementation = await upgrades.erc1967.getImplementationAddress(gameQuestionProxy.address);
    await questionFactory.connect(operator).addQuestionType(encodedID("I1"), gameQuestionImplementation);

    data1 = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
      [3, 1632049420, 1635600093, 90, 10, dfynToken.address, encodedID("G1Q1")],
    );

    data2 = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
      [3, 1632049420, 1635600093, 90, 10, dfynToken.address, encodedID("G1Q2")],
    );

    questionData = [
      {
        gameID: encodedID("G1"),
        questionID: encodedID("G1Q1"),
        data: data1,
      },
      {
        gameID: encodedID("G1"),
        questionID: encodedID("G1Q2"),
        data: data2,
      },
    ];
    questionData2 = [
      {
        gameID: encodedID("G1"),
        questionID: encodedID("G1Q2"),
        data: data2,
      },
    ];
  });

  // it("Able deploy question contract", async () => {
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   expect((await questionFactory.getGameQuestions(encodedID("G1"))).length).equals(2);
  // });

  // it("NOT Able deploy question repeatedly", async () => {
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);

  //   await expect(questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData2)).to.be.revertedWith("Question already deployed");
  // });

  // it("Able to emit game created event", async () => {
  //   await expect(questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData)).to.emit(
  //     questionFactory,
  //     "QuestionCreated",
  //   );
  // });

  // it("able to place the bet from factory", async () => {
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);
  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   expect((await gameQuestion.seeUserInfo(user.address)).amount.toString()).to.equal("10");
  // });

  // it("able to claim rewards from factory", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);
  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(0);
  //   await questionFactory.connect(user).claimBet(encodedID("G1Q1"));
  //   expect((await gameQuestion.seeUserInfo(user.address)).claimed).to.equal(true);
  // });

  // it("Able to claim full amount if game is cancelled", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);
  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(2);
  //   await questionFactory.connect(user).claimBet(encodedID("G1Q1"));
  //   //   expect((await gameQuestion.seeUserInfo(user.address)).claimed).to.equal(true)
  //   expect(await dfynToken.balanceOf(user.address)).to.equal(2000);
  // });

  // it("Able to claim full amount if no bets on other side", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);
  //   await dfynToken.connect(user1).approve(questionAddress, 100);
  //   await questionFactory.connect(user1).placeTheBet(encodedID("G1Q1"), data);
  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(0);
  //   await questionFactory.connect(user).claimBet(encodedID("G1Q1"));
  //   //   expect((await gameQuestion.seeUserInfo(user.address)).claimed).to.equal(true)
  //   expect(await dfynToken.balanceOf(user.address)).to.equal(2000);
  // });

  // it("Treasy gets full amount 0 bet side wins", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);

  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));

  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);

  //   await dfynToken.connect(user1).approve(questionAddress, 100);
  //   await questionFactory.connect(user1).placeTheBet(encodedID("G1Q1"), data);

  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(1);

  //   await gameQuestion.connect(admin).claimTreasury();
  //   //   expect((await gameQuestion.seeUserInfo(user.address)).claimed).to.equal(true)
  //   expect(await dfynToken.balanceOf(admin.address)).to.equal(20);
  // });

  // it("should NOT be able to claim if lost", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));

  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data);

  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(1);

  //   await expect(questionFactory.connect(user).claimBet(encodedID("G1Q1"))).to.be.revertedWith("Claim Failed");
  // });

  // it("should NOT be able to bet if betting timed out", async () => {
  //   data1 = ethers.utils.defaultAbiCoder.encode(
  //     ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
  //     [3, 163204920, 163560003, 90, 10, dfynToken.address, encodedID("G1Q1")],
  //   );

  //   questionData = [
  //     {
  //       gameID: encodedID("G1"),
  //       questionID: encodedID("G1Q1"),
  //       data: data1,
  //     },
  //   ];

  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await expect(questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data)).to.be.revertedWith("Bet Failed");
  // });

  // it("should NOT be able to bet if betting closed", async () => {
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));
  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(1);
  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await expect(questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data)).to.be.revertedWith("Bet Failed");
  // });

  // it("Bet option A 2x multiuser", async () => {
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const data1 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   const data2 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 1]);

  //   const questionAddress = await questionFactory.questionAddressMap(encodedID("G1Q1"));

  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await dfynToken.connect(user1).approve(questionAddress, 100);
  //   await dfynToken.connect(user2).approve(questionAddress, 100);

  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data1);
  //   await questionFactory.connect(user1).placeTheBet(encodedID("G1Q1"), data2);
  //   await questionFactory.connect(user2).placeTheBet(encodedID("G1Q1"), data2);

  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(0);

  //   await questionFactory.connect(user).claimBet(encodedID("G1Q1"));
  //   expect(await dfynToken.balanceOf(user.address)).to.equal(2017);
  // });

  // it("Test Claim All", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddresses = await questionFactory.connect(user).getGameQuestions(encodedID("G1"));
  //   console.log("questionAddresses", questionAddresses);
  //   for (let i = 0; i < questionAddresses.length; i++) {
  //     await dfynToken.approve(questionAddresses[i], 100, { from: user.address });
  //     await questionFactory.connect(user).placeTheBet(encodedID("G1Q" + (i + 1)), data);

  //     await dfynToken.connect(user1).approve(questionAddresses[i], 100);
  //     await questionFactory.connect(user1).placeTheBet(encodedID("G1Q" + (i + 1)), data);

  //     const gameQuestion = await gameQuestionContract.attach(questionAddresses[i]);
  //     await gameQuestion.connect(operator).executeQuestion(0);
  //   }
  //   await questionFactory.connect(user).claimGameBets(encodedID("G1"));
  //   await questionFactory.connect(user1).claimGameBets(encodedID("G1"));
  //   expect(await dfynToken.balanceOf(user.address)).to.equal(2000);
  //   expect(await dfynToken.balanceOf(user1.address)).to.equal(1000);
  // });

  // it("1 user Not Able to claim all twice", async () => {
  //   const data = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);
  //   const questionAddresses = await questionFactory.connect(user).getGameQuestions(encodedID("G1"));
  //   console.log("questionAddresses", questionAddresses);
  //   for (let i = 0; i < questionAddresses.length; i++) {
  //     await dfynToken.approve(questionAddresses[i], 100, { from: user.address });
  //     await questionFactory.connect(user).placeTheBet(encodedID("G1Q" + (i + 1)), data);

  //     await dfynToken.connect(user1).approve(questionAddresses[i], 100);
  //     await questionFactory.connect(user1).placeTheBet(encodedID("G1Q" + (i + 1)), data);

  //     const gameQuestion = await gameQuestionContract.attach(questionAddresses[i]);
  //     await gameQuestion.connect(operator).executeQuestion(0);
  //   }
  //   await questionFactory.connect(user).claimGameBets(encodedID("G1"));
  //   await questionFactory.connect(user1).claimGameBets(encodedID("G1"));
  //   await expect(questionFactory.connect(user).claimGameBets(encodedID("G1"))).to.be.revertedWith("Game rewards already claimed by user");
  // });

  // it("Test Treasury Claim All", async () => {
  //   const data1 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 0]);
  //   const data2 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint8"], [10, 1]);

  //   await questionFactory.connect(operator).deployQuestions(encodedID("I1"), questionData);

  //   const questionAddress = await questionFactory.connect(user).questionAddressMap(encodedID("G1Q1"));

  //   await dfynToken.approve(questionAddress, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q1"), data1);

  //   await dfynToken.connect(user1).approve(questionAddress, 100);
  //   await questionFactory.connect(user1).placeTheBet(encodedID("G1Q1"), data2);

  //   const gameQuestion = await gameQuestionContract.attach(questionAddress);
  //   await gameQuestion.connect(operator).executeQuestion(0);

  //   const questionAddress2 = await questionFactory.connect(user).questionAddressMap(encodedID("G1Q2"));

  //   await dfynToken.approve(questionAddress2, 100, { from: user.address });
  //   await questionFactory.connect(user).placeTheBet(encodedID("G1Q2"), data1);

  //   await dfynToken.connect(user1).approve(questionAddress2, 100);
  //   await questionFactory.connect(user1).placeTheBet(encodedID("G1Q2"), data2);

  //   const gameQuestion2 = await gameQuestionContract.attach(questionAddress2);
  //   await gameQuestion2.connect(operator).executeQuestion(0);

  //   //await gameQuestion.connect(admin).claimTreasury()
  //   await questionFactory.connect(admin).claimGameTreasury(encodedID("G1"));
  //   expect(await dfynToken.balanceOf(admin.address)).to.equal(4);
  // });
});
