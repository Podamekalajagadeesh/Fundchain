"use client";

import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  parseEther,
} from "ethers";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CONTRACT_ADDRESS =
  "0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignLoading, setCampaignLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("7");

  // Donation state
  const [donationAmounts, setDonationAmounts] = useState({});
  const [donatingCampaign, setDonatingCampaign] = useState(null);
  const [donationStatus, setDonationStatus] = useState({});
  const [campaignAction, setCampaignAction] = useState(null);
  const [campaignActionStatus, setCampaignActionStatus] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("fundchain_token");

    if (token) {
      loadUser(token);
    }

    loadCampaigns();
  }, []);

  async function loadUser(token) {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        localStorage.removeItem("fundchain_token");
        return;
      }

      setUser(result.user);
      setWallet(result.user.wallet);
      setStatus("Authenticated");
    } catch {
      setStatus("Failed to load user");
    }
  }

  async function loadCampaigns() {
    try {
      setCampaignLoading(true);

      const response = await fetch(`${API_URL}/api/campaigns`);
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.campaigns);
      }
    } catch (error) {
      console.error("Campaign loading error:", error);
    } finally {
      setCampaignLoading(false);
    }
  }


  async function ensureSepolia() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }

    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    }
  }

  async function connectWallet() {
    try {
      setLoading(true);
      setStatus("");

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      const provider = new BrowserProvider(window.ethereum);

      await provider.send("eth_requestAccounts", []);

      let network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });

          network = await provider.getNetwork();
        } catch {
          throw new Error(
            "Please switch MetaMask to the Sepolia network."
          );
        }
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWallet(address);

      setStatus("Requesting authentication challenge...");

      const nonceResponse = await fetch(
        `${API_URL}/api/auth/nonce`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallet: address,
          }),
        }
      );

      const challenge = await nonceResponse.json();

      if (!challenge.success) {
        throw new Error(challenge.error);
      }

      setStatus("Please sign the message in MetaMask...");

      const signature = await signer.signMessage(
        challenge.message
      );

      setStatus("Verifying wallet...");

      const verifyResponse = await fetch(
        `${API_URL}/api/auth/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallet: address,
            message: challenge.message,
            signature,
          }),
        }
      );

      const result = await verifyResponse.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      localStorage.setItem(
        "fundchain_token",
        result.token
      );

      setUser(result.user);
      setWallet(result.user.wallet);
      setStatus("Wallet authenticated successfully ✅");
    } catch (error) {
      console.error(error);

      setStatus(
        error?.message || "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign(event) {
    event.preventDefault();

    try {
      if (!user) {
        throw new Error(
          "Connect and authenticate your wallet first."
        );
      }

      if (!title.trim()) {
        throw new Error("Campaign title is required.");
      }

      if (!description.trim()) {
        throw new Error(
          "Campaign description is required."
        );
      }

      if (!goal || Number(goal) <= 0) {
        throw new Error("Enter a valid ETH goal.");
      }

      if (!duration || Number(duration) <= 0) {
        throw new Error(
          "Enter a valid campaign duration."
        );
      }

      setLoading(true);
      setStatus(
        "Preparing campaign transaction..."
      );

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      await ensureSepolia();

      const provider = new BrowserProvider(
        window.ethereum
      );

      const signer = await provider.getSigner();

      const abiResponse = await fetch(
        "/abi/Crowdfunding.json"
      );

      if (!abiResponse.ok) {
        throw new Error(
          "Failed to load contract ABI."
        );
      }

      const contractData = await abiResponse.json();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        contractData.abi,
        signer
      );

      const goalWei = parseEther(goal);

      const deadline =
        Math.floor(Date.now() / 1000) +
        Number(duration) * 24 * 60 * 60;

      setStatus(
        "Please confirm the campaign transaction in MetaMask..."
      );

      const transaction =
        await contract.createCampaign(
          title.trim(),
          description.trim(),
          goalWei,
          deadline
        );

      setStatus(
        `Transaction submitted: ${transaction.hash.slice(
          0,
          10
        )}...`
      );

      await transaction.wait();

      setStatus(
        "Campaign created on Sepolia ✅ Syncing with FundChain..."
      );

      setTitle("");
      setDescription("");
      setGoal("");
      setDuration("7");

      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

      await loadCampaigns();

      setStatus(
        "Campaign created successfully and synced ✅"
      );
    } catch (error) {
      console.error(
        "Campaign creation error:",
        error
      );

      if (error?.code === 4001) {
        setStatus(
          "Transaction rejected in MetaMask."
        );
      } else {
        setStatus(
          error?.shortMessage ||
            error?.reason ||
            error?.message ||
            "Campaign creation failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function donateToCampaign(campaign) {
    const campaignId = campaign.id;
    const amount =
      donationAmounts[campaignId]?.trim();

    try {
      if (!user) {
        throw new Error(
          "Connect and authenticate your wallet first."
        );
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error(
          "Enter a valid ETH donation amount."
        );
      }

      if (!campaign.contractCampaignId) {
        throw new Error(
          "This campaign is not linked to a blockchain campaign."
        );
      }

      if (campaign.status !== "ACTIVE") {
        throw new Error(
          "Only active campaigns can receive donations."
        );
      }

      const deadline = new Date(
        campaign.deadline
      ).getTime();

      if (deadline <= Date.now()) {
        throw new Error(
          "This campaign deadline has passed."
        );
      }

      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed."
        );
      }

      setDonatingCampaign(campaignId);

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Preparing donation transaction...",
      }));

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Checking MetaMask network...",
      }));

      await ensureSepolia();

      const provider = new BrowserProvider(
        window.ethereum
      );

      const network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        throw new Error(
          "Please switch MetaMask to Sepolia."
        );
      }

      const signer = await provider.getSigner();

      const signerAddress =
        await signer.getAddress();

      if (
        signerAddress.toLowerCase() !==
        wallet.toLowerCase()
      ) {
        throw new Error(
          "The connected MetaMask account does not match the authenticated wallet."
        );
      }

      const abiResponse = await fetch(
        "/abi/Crowdfunding.json"
      );

      if (!abiResponse.ok) {
        throw new Error(
          "Failed to load contract ABI."
        );
      }

      const contractData =
        await abiResponse.json();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        contractData.abi,
        signer
      );

      const amountWei = parseEther(amount);

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Please confirm the donation in MetaMask...",
      }));

      const transaction =
        await contract.contribute(
          BigInt(campaign.contractCampaignId),
          {
            value: amountWei,
          }
        );

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]: `Transaction submitted: ${transaction.hash.slice(
          0,
          10
        )}...`,
      }));

      await transaction.wait();

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Donation confirmed on Sepolia ✅ Syncing...",
      }));

      setDonationAmounts((previous) => ({
        ...previous,
        [campaignId]: "",
      }));

      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

      await loadCampaigns();

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Donation successful and synced ✅",
      }));
    } catch (error) {
      console.error(
        "Donation error:",
        error
      );

      let message =
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Donation failed.";

      if (error?.code === 4001) {
        message =
          "Transaction rejected in MetaMask.";
      }

      setDonationStatus((previous) => ({
        ...previous,
        [campaignId]: message,
      }));
    } finally {
      setDonatingCampaign(null);
    }
  }

  async function withdrawFromCampaign(campaign) {
    const campaignId = campaign.id;

    try {
      if (!user) {
        throw new Error("Connect your wallet first.");
      }

      if (!campaign.contractCampaignId) {
        throw new Error("Campaign is not linked to the blockchain.");
      }

      if (Number(campaign.raisedAmount) < Number(campaign.goalAmount)) {
        throw new Error("Campaign goal has not been reached.");
      }

      if (
        !campaign.creator?.wallet ||
        campaign.creator.wallet.toLowerCase() !== wallet.toLowerCase()
      ) {
        throw new Error("Only the campaign creator can withdraw.");
      }

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      setCampaignAction(campaignId);
      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]: "Preparing withdrawal...",
      }));

      await ensureSepolia();

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const signerAddress = await signer.getAddress();

      if (
        signerAddress.toLowerCase() !==
        campaign.creator.wallet.toLowerCase()
      ) {
        throw new Error(
          "Connected wallet must be the campaign creator."
        );
      }

      const abiResponse = await fetch("/abi/Crowdfunding.json");

      if (!abiResponse.ok) {
        throw new Error("Failed to load contract ABI.");
      }

      const contractData = await abiResponse.json();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        contractData.abi,
        signer
      );

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Confirm the withdrawal in MetaMask...",
      }));

      const transaction = await contract.withdraw(
        BigInt(campaign.contractCampaignId)
      );

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          `Withdrawal submitted: ${transaction.hash.slice(0, 10)}...`,
      }));

      await transaction.wait();

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Withdrawal confirmed. Syncing...",
      }));

      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

      await loadCampaigns();

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Funds withdrawn successfully ✅",
      }));
    } catch (error) {
      console.error("Withdrawal error:", error);

      let message =
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Withdrawal failed.";

      if (error?.code === 4001) {
        message = "Transaction rejected in MetaMask.";
      }

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]: message,
      }));
    } finally {
      setCampaignAction(null);
    }
  }

  async function refundCampaign(campaign) {
    const campaignId = campaign.id;

    try {
      if (!user) {
        throw new Error("Connect your wallet first.");
      }

      if (!campaign.contractCampaignId) {
        throw new Error("Campaign is not linked to the blockchain.");
      }

      const deadline =
        new Date(campaign.deadline).getTime();

      if (deadline > Date.now()) {
        throw new Error(
          "Campaign deadline has not passed yet."
        );
      }

      if (
        Number(campaign.raisedAmount) >=
        Number(campaign.goalAmount)
      ) {
        throw new Error(
          "Campaign reached its goal. Refund is unavailable."
        );
      }

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      setCampaignAction(campaignId);

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Checking your contribution...",
      }));

      await ensureSepolia();

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const abiResponse = await fetch("/abi/Crowdfunding.json");

      if (!abiResponse.ok) {
        throw new Error("Failed to load contract ABI.");
      }

      const contractData = await abiResponse.json();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        contractData.abi,
        signer
      );

      const contribution =
        await contract.getContribution(
          BigInt(campaign.contractCampaignId),
          signerAddress
        );

      if (contribution === 0n) {
        throw new Error(
          "You do not have a refundable contribution."
        );
      }

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Confirm the refund in MetaMask...",
      }));

      const transaction = await contract.refund(
        BigInt(campaign.contractCampaignId)
      );

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          `Refund submitted: ${transaction.hash.slice(0, 10)}...`,
      }));

      await transaction.wait();

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Refund confirmed. Syncing...",
      }));

      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

      await loadCampaigns();

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]:
          "Refund issued successfully ✅",
      }));
    } catch (error) {
      console.error("Refund error:", error);

      let message =
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Refund failed.";

      if (error?.code === 4001) {
        message = "Transaction rejected in MetaMask.";
      }

      setCampaignActionStatus((previous) => ({
        ...previous,
        [campaignId]: message,
      }));
    } finally {
      setCampaignAction(null);
    }
  }

  function logout() {
    localStorage.removeItem(
      "fundchain_token"
    );

    setUser(null);
    setWallet("");
    setStatus("Logged out");
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  function formatStatus(status) {
    return status.replaceAll("_", " ");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "32px",
            borderRadius: "20px",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.07)",
          }}
        >
          <h1
            style={{
              marginBottom: "8px",
              fontSize: "36px",
            }}
          >
            FundChain
          </h1>

          <p style={{ color: "#666" }}>
            Decentralized crowdfunding on Ethereum
          </p>

          <hr style={{ margin: "28px 0" }} />

          {!user ? (
            <button
              onClick={connectWallet}
              disabled={loading}
              style={{
                padding: "14px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#111",
                color: "#fff",
                fontSize: "16px",
                cursor: loading
                  ? "wait"
                  : "pointer",
              }}
            >
              {loading
                ? "Authenticating..."
                : "Connect Wallet"}
            </button>
          ) : (
            <>
              <div
                style={{
                  padding: "20px",
                  background: "#f5f5f5",
                  borderRadius: "14px",
                  marginBottom: "30px",
                }}
              >
                <h2>
                  Wallet Connected ✅
                </h2>

                <p>
                  <strong>Wallet:</strong>
                </p>

                <code
                  style={{
                    display: "block",
                    padding: "12px",
                    background: "#fff",
                    borderRadius: "8px",
                    wordBreak: "break-all",
                  }}
                >
                  {wallet}
                </code>

                <p>
                  <strong>Role:</strong>{" "}
                  {user.role}
                </p>

                <button
                  onClick={logout}
                  style={{
                    padding: "10px 18px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>

              <section
                style={{
                  marginBottom: "40px",
                }}
              >
                <h2>
                  Create Campaign
                </h2>

                <p style={{ color: "#666" }}>
                  Launch a crowdfunding campaign
                  directly on Ethereum Sepolia.
                </p>

                <form
                  onSubmit={createCampaign}
                >
                  <div
                    style={{
                      marginBottom: "18px",
                    }}
                  >
                    <label>
                      <strong>
                        Title
                      </strong>
                    </label>

                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Build a decentralized marketplace"
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "13px",
                        marginTop: "8px",
                        border:
                          "1px solid #ddd",
                        borderRadius: "9px",
                        boxSizing:
                          "border-box",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginBottom: "18px",
                    }}
                  >
                    <label>
                      <strong>
                        Description
                      </strong>
                    </label>

                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      placeholder="Explain what you are raising funds for..."
                      rows={5}
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "13px",
                        marginTop: "8px",
                        border:
                          "1px solid #ddd",
                        borderRadius: "9px",
                        boxSizing:
                          "border-box",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "18px",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <label>
                        <strong>
                          Goal (ETH)
                        </strong>
                      </label>

                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={goal}
                        onChange={(e) =>
                          setGoal(
                            e.target.value
                          )
                        }
                        placeholder="0.01"
                        disabled={loading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          marginTop: "8px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          boxSizing:
                            "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label>
                        <strong>
                          Duration (days)
                        </strong>
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) =>
                          setDuration(
                            e.target.value
                          )
                        }
                        disabled={loading}
                        style={{
                          width: "100%",
                          padding: "13px",
                          marginTop: "8px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          boxSizing:
                            "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "15px",
                      border: "none",
                      borderRadius: "10px",
                      background: "#111",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: loading
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    {loading
                      ? "Processing..."
                      : "Create Campaign"}
                  </button>
                </form>
              </section>
            </>
          )}

          {status && (
            <div
              style={{
                marginTop: "20px",
                padding: "14px",
                background: "#f1f3f5",
                borderRadius: "10px",
                color: "#333",
                wordBreak: "break-word",
              }}
            >
              {status}
            </div>
          )}
        </div>

        <section
          style={{
            marginTop: "30px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <h2>Campaigns</h2>

            <button
              onClick={loadCampaigns}
              disabled={campaignLoading}
              style={{
                padding: "9px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {campaignLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: "30px",
                borderRadius: "14px",
                textAlign: "center",
                color: "#666",
              }}
            >
              No campaigns yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              {campaigns.map((campaign) => {
                const goalNumber =
                  Number(campaign.goalAmount);

                const raisedNumber =
                  Number(
                    campaign.raisedAmount
                  );

                const progress =
                  goalNumber > 0
                    ? Math.min(
                        100,
                        (raisedNumber /
                          goalNumber) *
                          100
                      )
                    : 0;

                const isActive =
                  campaign.status ===
                  "ACTIVE";

                const deadlinePassed =
                  new Date(
                    campaign.deadline
                  ).getTime() <=
                  Date.now();

                const canDonate =
                  user &&
                  isActive &&
                  !deadlinePassed &&
                  campaign.contractCampaignId;

                const donationMessage =
                  donationStatus[
                    campaign.id
                  ];

                const isDonating =
                  donatingCampaign ===
                  campaign.id;

                const isActing =
                  campaignAction === campaign.id;

                const actionMessage =
                  campaignActionStatus[campaign.id];

                const isCreator =
                  user &&
                  campaign.creator?.wallet &&
                  campaign.creator.wallet.toLowerCase() ===
                    wallet.toLowerCase();

                const canWithdraw =
                  Boolean(isCreator) &&
                  Boolean(campaign.contractCampaignId) &&
                  raisedNumber >= goalNumber &&
                  campaign.status === "SUCCESSFUL";

                const canRefund =
                  Boolean(user) &&
                  Boolean(campaign.contractCampaignId) &&
                  deadlinePassed &&
                  raisedNumber < goalNumber;

                return (
                  <div
                    key={campaign.id}
                    style={{
                      background: "#fff",
                      padding: "24px",
                      borderRadius: "16px",
                      boxShadow:
                        "0 6px 24px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "15px",
                      }}
                    >
                      <div>
                        <h3>
                          {campaign.title}
                        </h3>

                        <p
                          style={{
                            color: "#666",
                          }}
                        >
                          {campaign.description ||
                            "No description"}
                        </p>
                      </div>

                      <strong>
                        {formatStatus(
                          campaign.status
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop: "20px",
                        height: "10px",
                        background:
                          "#e9ecef",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background: "#111",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        marginTop: "10px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      <span>
                        {raisedNumber} ETH
                        raised
                      </span>

                      <span>
                        {goalNumber} ETH goal
                      </span>
                    </div>

                    <p
                      style={{
                        marginTop: "14px",
                        fontSize: "13px",
                        color: "#777",
                      }}
                    >
                      Deadline:{" "}
                      {formatDate(
                        campaign.deadline
                      )}
                    </p>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      Contract Campaign ID:{" "}
                      {
                        campaign.contractCampaignId
                      }
                    </p>

                    {/* CAMPAIGN ACTIONS */}
                    {(canWithdraw || canRefund || actionMessage) && (
                      <div
                        style={{
                          marginTop: "22px",
                          paddingTop: "20px",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        <h4 style={{ marginBottom: "10px" }}>
                          Campaign Actions
                        </h4>

                        {canWithdraw && (
                          <button
                            onClick={() =>
                              withdrawFromCampaign(campaign)
                            }
                            disabled={isActing}
                            style={{
                              width: "100%",
                              padding: "13px",
                              border: "none",
                              borderRadius: "9px",
                              background: "#111",
                              color: "#fff",
                              fontWeight: "bold",
                              cursor: isActing
                                ? "wait"
                                : "pointer",
                              marginBottom: "10px",
                            }}
                          >
                            {isActing
                              ? "Processing..."
                              : "Withdraw Funds"}
                          </button>
                        )}

                        {canRefund && (
                          <button
                            onClick={() =>
                              refundCampaign(campaign)
                            }
                            disabled={isActing}
                            style={{
                              width: "100%",
                              padding: "13px",
                              border: "1px solid #ddd",
                              borderRadius: "9px",
                              background: "#fff",
                              color: "#111",
                              fontWeight: "bold",
                              cursor: isActing
                                ? "wait"
                                : "pointer",
                            }}
                          >
                            {isActing
                              ? "Processing..."
                              : "Claim Refund"}
                          </button>
                        )}

                        {actionMessage && (
                          <p
                            style={{
                              marginTop: "12px",
                              marginBottom: 0,
                              fontSize: "13px",
                              color: "#555",
                              wordBreak: "break-word",
                            }}
                          >
                            {actionMessage}
                          </p>
                        )}
                      </div>
                    )}

                    {/* DONATION SECTION */}
                    <div
                      style={{
                        marginTop: "22px",
                        paddingTop: "20px",
                        borderTop:
                          "1px solid #eee",
                      }}
                    >
                      <h4
                        style={{
                          marginBottom:
                            "8px",
                        }}
                      >
                        Support this campaign
                      </h4>

                      {!user ? (
                        <p
                          style={{
                            color: "#777",
                            fontSize: "14px",
                          }}
                        >
                          Connect your wallet
                          to donate.
                        </p>
                      ) : !isActive ? (
                        <p
                          style={{
                            color: "#777",
                            fontSize: "14px",
                          }}
                        >
                          Donations are
                          unavailable for
                          this campaign.
                        </p>
                      ) : deadlinePassed ? (
                        <p
                          style={{
                            color: "#777",
                            fontSize: "14px",
                          }}
                        >
                          Campaign deadline
                          has passed.
                        </p>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                            }}
                          >
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              placeholder="Amount in ETH"
                              value={
                                donationAmounts[
                                  campaign.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setDonationAmounts(
                                  (
                                    previous
                                  ) => ({
                                    ...previous,
                                    [campaign.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                              disabled={
                                isDonating
                              }
                              style={{
                                flex: 1,
                                padding:
                                  "13px",
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "9px",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <button
                              onClick={() =>
                                donateToCampaign(
                                  campaign
                                )
                              }
                              disabled={
                                !canDonate ||
                                isDonating
                              }
                              style={{
                                padding:
                                  "13px 20px",
                                border: "none",
                                borderRadius:
                                  "9px",
                                background:
                                  canDonate &&
                                  !isDonating
                                    ? "#111"
                                    : "#aaa",
                                color: "#fff",
                                fontWeight:
                                  "bold",
                                cursor:
                                  canDonate &&
                                  !isDonating
                                    ? "pointer"
                                    : "not-allowed",
                              }}
                            >
                              {isDonating
                                ? "Donating..."
                                : "Donate"}
                            </button>
                          </div>

                          {donationMessage && (
                            <div
                              style={{
                                marginTop:
                                  "12px",
                                padding:
                                  "12px",
                                background:
                                  "#f1f3f5",
                                borderRadius:
                                  "8px",
                                fontSize:
                                  "13px",
                                color:
                                  "#333",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {
                                donationMessage
                              }
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
