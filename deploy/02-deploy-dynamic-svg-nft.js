const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    log("02-DEPLOY-START--------------------------------------------")
    log(`Network: ${networkConfig[network.config.chainId]["name"]}`)
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const EthUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = EthUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress =
            networkConfig[chainId]["ethUsdPriceFeedAddress"]
    }

    const lowSvg = fs.readFileSync("./images/dynamicNft/frown.svg", {
        encoding: "utf8",
    })

    const highSvg = fs.readFileSync("./images/dynamicNft/happy.svg", {
        encoding: "utf8",
    })

    const args = [ethUsdPriceFeedAddress, lowSvg, highSvg]

    log("DEPLOYMENT --> DYNAMIC SVG NFT")
    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(dynamicSvgNft.address, args)
    }

    log("02-DEPLOY-END----------------------------------------------")
}

module.exports.tags = ["all", "dynamicsvg", "main"]
