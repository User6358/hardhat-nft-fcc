const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let basicNft, deployer, accounts

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNft")
          })

          //tests01
          describe("Constructor", () => {
              it("Initializes the NFT correctly (name, symbol, token counter).", async () => {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })

          //tests02
          describe("Mint NFT", () => {
              let txResponse

              beforeEach(async () => {
                  txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
              })
              it("Allows user to mint an NFT. Updates counter and URI appropriately", async function () {
                  const tokenUriConstant = await basicNft.TOKEN_URI()
                  const tokenUriGetter = await basicNft.tokenURI(0)
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(tokenCounter.toString(), "1")
                  assert.equal(tokenUriConstant, tokenUriGetter)
              })
              it("Shows the correct user balance and NFT owner", async function () {
                  const deployerAddress = deployer.address
                  const deployerBalance = await basicNft.balanceOf(
                      deployerAddress
                  )
                  const owner = await basicNft.ownerOf("1")

                  // The owner has 1 NFT, hence a token balance of 1
                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployerAddress)
              })
          })
      })
