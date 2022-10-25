const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              )
          })

          describe("constructor", () => {
              it("initializes the NFT correctly", async () => {
                  const name = await randomIpfsNft.name()
                  const symbol = await randomIpfsNft.symbol()
                  const tokenCounter = await randomIpfsNft.getTokenCounter()
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNft.getInitialized()
                  assert.equal(name, "Random IPFS NFT")
                  assert.equal(symbol, "RIN")
                  assert.equal(tokenCounter.toString(), "0")
                  assert.equal(dogTokenUriZero.includes("ipfs://"), true)
                  assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", () => {
              it("reverts if payment isn't sent with the request", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("reverts if payment amount is less than the mint fee", async function () {
                  const mintFee = await randomIpfsNft.getMintFee()
                  await expect(
                      randomIpfsNft.requestNft({
                          value: mintFee.sub(ethers.utils.parseEther("0.0001")),
                      })
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async function () {
                  const mintFee = await randomIpfsNft.getMintFee()
                  await expect(
                      randomIpfsNft.requestNft({
                          value: mintFee.toString(),
                      })
                  ).to.emit(randomIpfsNft, "NftRequested")
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter =
                                  await randomIpfsNft.getTokenCounter()
                              assert.equal(
                                  tokenUri.toString().includes("ipfs://"),
                                  true
                              )
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      try {
                          const mintFee = await randomIpfsNft.getMintFee()
                          const requestNftResponse =
                              await randomIpfsNft.requestNft({
                                  value: mintFee.toString(),
                              })
                          const requestNftReceipt =
                              await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (error) {
                          console.log(error)
                          reject(error)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if 10 < moddedRng < 39", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if 40 < moddedRng < 99", async function () {
                  const expectedValue =
                      await randomIpfsNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert moddedRng > 99", async function () {
                  await expect(
                      randomIpfsNft.getBreedFromModdedRng(100)
                  ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds")
              })
          })
      })
