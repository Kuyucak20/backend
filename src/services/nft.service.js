const { ethers } = require('ethers');
const config = require('../config/config');
const logger = require('../config/logger');

// Contract ABI - sadece kullandigimiz fonksiyonlar
const CONTRACT_ABI = [
  'function mintLand(address to, string calldata landId) external returns (uint256)',
  'function transferLand(address from, address to, uint256 tokenId) external',
  'function getLandId(uint256 tokenId) external view returns (string)',
  'function getTokenByLandId(string calldata landId) external view returns (uint256)',
  'function totalMinted() external view returns (uint256)',
];

// Nonce yonetimi (concurrent mint cakismalarini onlemek icin)
let nonceLock = Promise.resolve();

const getProvider = () => {
  return new ethers.JsonRpcProvider(config.bnb.rpcUrl, {
    chainId: config.bnb.chainId,
    name: 'bnb-testnet',
  });
};

const getOwnerWallet = () => {
  const pk = config.bnb.ownerPrivateKey || '6e39e078281d54343421b85d230965ca184af74e051415c5eee8735655af6b2f';
  if (!pk || pk === 'DEPLOY_SONRASI_BURAYA_YAZ') {
    return null;
  }
  return new ethers.Wallet(pk, getProvider());
};

const getContract = () => {
  const wallet = getOwnerWallet();
  const contractAddr = config.bnb.nftContractAddress || '0x8e8B1dA32279a5b96740E7F365DDfd4a820BfBA6';
  if (!wallet || !contractAddr || contractAddr === 'DEPLOY_SONRASI_BURAYA_YAZ') {
    return null;
  }
  return new ethers.Contract(contractAddr, CONTRACT_ABI, wallet);
};

/**
 * Yeni BNB cuzdan olustur (kayit esnasinda)
 */
const createWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

/**
 * NFT mint et (arsa satin alindiktan sonra)
 */
const mintNFT = async (toAddress, landId) => {
  const contract = getContract();
  if (!contract) {
    logger.warn('NFT contract not configured, skipping mint');
    return { tokenId: null, txHash: null };
  }

  // Nonce lock ile sirayla islem yap
  const result = await (nonceLock = nonceLock.then(async () => {
    try {
      logger.info(`Minting NFT: landId=${landId}, to=${toAddress}`);
      const tx = await contract.mintLand(toAddress, landId);
      const receipt = await tx.wait();

      // tokenId'yi event'ten al
      let tokenId = null;
      if (receipt.logs && receipt.logs.length > 0) {
        // Transfer event: Transfer(address from, address to, uint256 tokenId)
        for (const log of receipt.logs) {
          try {
            if (log.topics && log.topics.length >= 4) {
              tokenId = parseInt(log.topics[3], 16);
              break;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      // Fallback: contract'tan oku
      if (!tokenId) {
        tokenId = Number(await contract.getTokenByLandId(landId));
      }

      logger.info(`NFT minted: tokenId=${tokenId}, txHash=${receipt.hash}, land=${landId}`);
      return { tokenId, txHash: receipt.hash };
    } catch (error) {
      logger.error(`NFT mint failed for ${landId}: ${error.message}`);
      throw error;
    }
  }));

  return result;
};

/**
 * NFT transfer et (arsa satisi)
 */
const transferNFT = async (fromAddress, toAddress, tokenId) => {
  const contract = getContract();
  if (!contract) {
    logger.warn('NFT contract not configured, skipping transfer');
    return { txHash: null };
  }

  const result = await (nonceLock = nonceLock.then(async () => {
    try {
      logger.info(`Transferring NFT: tokenId=${tokenId}, from=${fromAddress}, to=${toAddress}`);
      const tx = await contract.transferLand(fromAddress, toAddress, tokenId);
      const receipt = await tx.wait();
      logger.info(`NFT transferred: tokenId=${tokenId}, txHash=${receipt.hash}`);
      return { txHash: receipt.hash };
    } catch (error) {
      logger.error(`NFT transfer failed for tokenId=${tokenId}: ${error.message}`);
      throw error;
    }
  }));

  return result;
};

/**
 * Kullanicinin BNB'sini dis adrese cek
 */
const withdrawBNB = async (userPrivateKey, toAddress, amountInBNB) => {
  const provider = getProvider();
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  const tx = await userWallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountInBNB),
  });
  const receipt = await tx.wait();

  logger.info(`BNB withdrawn: ${amountInBNB} BNB to ${toAddress}, txHash=${receipt.hash}`);
  return { txHash: receipt.hash };
};

/**
 * Kullanicinin BNB bakiyesini kontrol et
 */
const getBNBBalance = async (address) => {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
};

module.exports = {
  createWallet,
  mintNFT,
  transferNFT,
  withdrawBNB,
  getBNBBalance,
  getProvider,
  getOwnerWallet,
  getContract,
};
