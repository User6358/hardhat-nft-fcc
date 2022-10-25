// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";

error DynamicSvgNft_URIQueryForNonExistentToken();

contract DynamicSvgNft is ERC721 {
    uint256 s_tokenCounter;

    string private s_lowImageUri;
    string private s_highImageUri;
    string private constant BASE64_ENCODED_SVG_PREFIX =
        "data:image/svg+xml;base64,";
    AggregatorV3Interface internal immutable i_priceFeed;
    mapping(uint256 => int256) private s_tokenIdToHighValues;

    event CreatedNft(uint256 indexed tokenId, int256 highValue);

    constructor(
        address priceFeedAddress,
        string memory lowSvg,
        string memory highSvg
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        s_lowImageUri = svgToImageUri(lowSvg);
        s_highImageUri = svgToImageUri(highSvg);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function mintNft(int256 highValue) public {
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter++;
        s_tokenIdToHighValues[newTokenId] = highValue;
        _safeMint(msg.sender, newTokenId);
        emit CreatedNft(newTokenId, highValue);
    }

    // Encodes SVG images into base64 code
    // This code can then be used as the image URI
    function svgToImageUri(string memory svg)
        public
        pure
        returns (string memory)
    {
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );
        return
            string(
                abi.encodePacked(BASE64_ENCODED_SVG_PREFIX, svgBase64Encoded)
            );
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (!_exists(tokenId)) {
            revert DynamicSvgNft_URIQueryForNonExistentToken();
        }
        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        string memory imageUri = s_lowImageUri;
        if (price >= s_tokenIdToHighValues[tokenId]) {
            imageUri = s_highImageUri;
        }

        bytes memory bytesTokenMetadata = bytes(
            abi.encodePacked(
                '{"name":"',
                name(),
                '", "description":',
                '"An NFT that changes based on the Chainlink feed", ',
                '"attributes": ',
                '[{"trait_type": "coolness", "value": 100}],',
                '"image":"',
                imageUri,
                '"}'
            )
        );
        return
            string(
                abi.encodePacked(_baseURI(), Base64.encode(bytesTokenMetadata))
            );
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getLowSvgUri() public view returns (string memory) {
        return s_lowImageUri;
    }

    function getHighSvgUri() public view returns (string memory) {
        return s_highImageUri;
    }
}
