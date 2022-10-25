const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()

    console.log("04-DEPLOY-START--------------------------------------------")
    // Basic NFT
    console.log("MINT --> BASIC NFT")
    const basicNft = await ethers.getContract("BasicNft", deployer)
    const basicNftMintTx = await basicNft.mintNft()
    await basicNftMintTx.wait(1)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`)

    // Dynamic SVG NFT
    console.log("MINT --> DYNAMIC SVG NFT")
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
    const dynamicSvgNftTx = await dynamicSvgNft.mintNft(highValue.toString())
    await dynamicSvgNftTx.wait(1)
    console.log(
        `Dynamic SVG NFT index 0 has tokenURI: ${await dynamicSvgNft.tokenURI(
            0
        )}`
    )

    // Random IPFS NFT
    console.log("MINT --> RANDOM IPFS NFT")
    const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
    const mintFee = await randomIpfsNft.getMintFee()
    await new Promise(async (resolve, reject) => {
        setTimeout(resolve, 300000) // 5 minutes (300 milliseconds)
        randomIpfsNft.once("NftMinted", async function () {
            resolve()
        })
        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
            value: mintFee.toString(),
        })
        const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1)
        if (developmentChains.includes(network.name)) {
            const requestId =
                randomIpfsNftMintTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                randomIpfsNft.address
            )
        }
    })
    console.log(
        `Random IPFS NFT index 0 has tokenURI: ${await randomIpfsNft.tokenURI(
            0
        )}`
    )
    console.log("04-DEPLOY-END----------------------------------------------")
}

module.exports.tags = ["all", "mint"]
