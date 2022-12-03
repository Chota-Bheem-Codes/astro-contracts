import { task } from "hardhat/config";
import { ethers, Contract } from "ethers";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { TaskArguments } from "hardhat/types";
import GameQuestion from "../../artifacts/contracts/GameQuestion.sol/GameQuestion.json";
import { AstroToken, AstroToken__factory, Factory, Factory__factory } from "../../typechain";

const encodedID = (id: string) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(id));

task("deploy:AstroTest").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const testErc20Factory = await ethers.getContractFactory("AstroToken");
  const totalsupply = ethers.utils.parseEther("100000");
  const testERC20: AstroToken = <AstroToken>await testErc20Factory.deploy(totalsupply.toString());
  await testERC20.deployed();
  console.log("Test Astro deployed to: ", testERC20.address);
});

task("deploy:Factory").setAction(async function (taskArguments: TaskArguments, { ethers, upgrades, run }) {
  const adminAddress = "0xaC4ed32d9c7F2a7ed6FAa25f7C1Efba100502B91";
  const operatorAddress = "0xaC4ed32d9c7F2a7ed6FAa25f7C1Efba100502B91";
  //const gameToken = "0x2eEe3947c2747Aa6206B64064eb3AB1ddf0BC35b";
  const factory = await ethers.getContractFactory("Factory");
  const factoryContract: Factory = <Factory>(
    await upgrades.deployProxy(factory, [adminAddress, operatorAddress], { kind: "uups" })
  );
  await factoryContract.deployed();
  console.log("Game factory deployed proxy to: ", factoryContract.address);

  const factoryImplementation = await upgrades.erc1967.getImplementationAddress(factoryContract.address);

  console.log("Game factory deployed implementation to: ", factoryImplementation);

  await run("verify:verify", {
    address: factoryImplementation,
  });
});

task("deploy:Question").setAction(async function (taskArguments: TaskArguments, { ethers, upgrades, run }) {
  const adminAddress = "0xaC4ed32d9c7F2a7ed6FAa25f7C1Efba100502B91";
  const operatorAddress = "0xaC4ed32d9c7F2a7ed6FAa25f7C1Efba100502B91";
  const gameToken = "0xfF2e69aAd5b6a4903347aADcd70E632AF0015B8F";
  const factoryAddress = "0xaF1384C026c490f300209854e86078ed01724b96";
  const gameQuestionContract = await ethers.getContractFactory("GameQuestion");
  const factoryContract = await ethers.getContractFactory("Factory");

  const params = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "uint8", "uint8", "address", "bytes32"],
    [3, 1632049420, 1635518892, 90, 10, gameToken, encodedID("G1Q0")],
  );

  const gameQuestionProxy = await upgrades.deployProxy(gameQuestionContract, [params, adminAddress, operatorAddress]);
  await gameQuestionProxy.deployed();

  console.log("Game Question I1 deployed proxy to: ", gameQuestionProxy.address);
  //Impelementation Contract
  const gameQuestionImplementation = await upgrades.erc1967.getImplementationAddress(gameQuestionProxy.address);
  console.log("Game Question I1 deployed implementation to: ", gameQuestionImplementation);
  const questionFactory = await factoryContract.attach(factoryAddress);
  await questionFactory.addQuestionType(encodedID("I1"), gameQuestionImplementation);
  await run("verify:verify", {
    address: gameQuestionImplementation,
  });
});
