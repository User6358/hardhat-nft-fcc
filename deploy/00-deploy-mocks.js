const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { networkConfig } = require("../helper-hardhat-config")

// 0.25 is the premium. It costs 0.25 LINK per request
const BASE_FEE = ethers.utils.parseEther("0.25")
// LINK per gas. Chainlink Nodes pay the gas fees to give us randomness
// & do external execution. So the price of requests change based on the
// price of gas
const GAS_PRICE_LINK = 1e9

const DECIMALS = "18"
const INITIAL_PRICE = ethers.utils.parseUnits("2000", "ether")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    log("00-DEPLOY-START--------------------------------------------")
    log(`Network: ${networkConfig[network.config.chainId]["name"]}`)

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })

        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })

        log("Mocks Deployed!")
    }
    log("00-DEPLOY-END----------------------------------------------")
}

module.exports.tags = ["all", "mocks"]
