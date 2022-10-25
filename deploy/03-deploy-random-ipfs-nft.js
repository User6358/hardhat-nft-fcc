const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {
    storeImages,
    storeTokenUriMetadata,
} = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

const FUND_AMOUNT = ethers.utils.parseEther("10")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    log("03-DEPLOY-START--------------------------------------------")
    log(`Network: ${networkConfig[network.config.chainId]["name"]}`)
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let tokenUris

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    } else {
        tokenUris = [
            "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
            "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
            "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
        ]
    }

    let vrfCoordinatorV2Address, subscriptionId

    log("DEPLOYMENT --> VRF COORDINATOR")
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        )
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("DEPLOYMENT --> RANDOM IPFS NFT")
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(randomIpfsNft.address, args)
    }
    log("03-DEPLOY-END----------------------------------------------")
}

async function handleTokenUris() {
    console.log("-> handleTokenUris")
    tokenUris = []
    // 1 - Storing the image in Pinata (IPFS node)------------------------------------------------
    // Each element in responses contains the IpfsHash, PinSize and TimeStamp
    const { responses: imageUploadResponses, files } = await storeImages(
        imagesLocation
    )
    // 2 - Storing the metadata in Pinata (IPFS node)---------------------------------------------
    for (imageUploadResponseIndex in imageUploadResponses) {
        // a - Creating metadata------------------------------------------------------------------
        // ... is a special syntax for inputing arrays/JSON
        // Without it, each element of the array would need to be pushed
        // 1 by 1 in tokenUriMetaData
        let tokenUriMetadata = { ...metadataTemplate }
        // Dropping the .png extension to set the NFT name
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(
            ".png",
            ""
        )
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        // b - Uploading metadata-----------------------------------------------------------------
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        const metadataUploadResponse = await storeTokenUriMetadata(
            tokenUriMetadata
        )
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs Uploaded! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
