# ◈ Soul - an AI you actually own

> Create an AI companion, chat with it, and **mint it as an NFT on the 0G chain**.
> Its memory doesn't live on our server - it lives in **decentralized 0G Storage**.
> Close the tab, switch devices, hand it to a friend: it still remembers you,
> because its brain lives on-chain.

Built for **[The Zero Cup - 0G's Global Vibe Coding Tournament](https://0g.ai/arena/zero-cup)**.

---

## The "wow" in 30 seconds

1. **Create** a companion - give it a name and a personality.
2. **Chat** with it. Every reply is generated through **0G Compute** (decentralized GPUs).
3. **Save & Mint.** Its full state (personality + memory) is written to **0G Storage**,
   and the companion is **minted as an ERC-721** on the 0G chain - the token points
   at the memory's storage root hash.
4. **Reload.** Open the shareable link `/agent/<tokenId>` from *any* browser or wallet.
   The app reads the on-chain memory pointer and pulls the memory back from 0G Storage -
   **it remembers you**. Nothing was stored on our server.

This is 0G's whole thesis - *ownable, persistent, decentralized AI* - in one demo.

---

## How 0G is used

Soul is genuinely 0G-native, not an API wrapper. All three layers do real work:

| 0G layer | What it does in Soul | Where in the code |
|----------|----------------------|-------------------|
| **0G Compute** | Every chat reply - OpenAI-compatible inference via the Compute Router (`qwen2.5-omni`). | [`lib/og-compute.ts`](lib/og-compute.ts), [`app/api/chat/route.ts`](app/api/chat/route.ts) |
| **0G Storage** | The agent's memory (a JSON blob: personality, rolling summary, key facts, history) is uploaded and fetched by **root hash** - no centralized DB. | [`lib/og-storage.ts`](lib/og-storage.ts), [`app/api/memory/route.ts`](app/api/memory/route.ts) |
| **0G Chain** | The companion is an **ERC-721**; each token stores a `tokenId → memoryRootHash` pointer that only the token owner can update. | [`contracts/SoulAgent.sol`](contracts/SoulAgent.sol), [`lib/contract.ts`](lib/contract.ts), [`lib/chain.ts`](lib/chain.ts) |

**Deployed contract (0G Galileo testnet, chain `16602`):**
[`0xc2cC37d16Bb04E6004E3f19CBb079aC21094121A`](https://chainscan-galileo.0g.ai/address/0xc2cC37d16Bb04E6004E3f19CBb079aC21094121A)

### Two-wallet model (so judges don't mistake it for centralized)
- A **server wallet** pays the gas to write memory blobs to 0G Storage (a server-side
  operation), so the UX stays gasless for that step.
- The **user's own wallet** owns the NFT and signs the mint / memory-pointer updates.

Memory therefore lives on 0G Storage and **ownership lives on-chain** - the server
never holds the companion.

---

## Architecture

```
Browser ──► /api/chat   ──► 0G Compute Router      (inference)
        ──► /api/memory ──► 0G Storage (MemData)    (memory blob → rootHash)
        ──► wagmi/viem  ──► SoulAgent ERC-721       (mint, setMemory, memoryOf)

agent-core (pure, tested) builds the system prompt + bounds memory history.
A local fallback keeps the chat demo alive even if the testnet is flaky.
```

- `lib/agent-core.ts` - pure, unit-tested core: prompt assembly + memory bounding.
- `components/ChatConsole.tsx` - chat, save & mint, on-chain memory updates.
- `app/agent/[tokenId]/page.tsx` - the reload-and-remember screen.

---

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
wagmi v2 + RainbowKit v2 + viem (frontend) · ethers v6 (server) ·
`@0gfoundation/0g-storage-ts-sdk` · OpenAI SDK (pointed at the 0G Router) ·
Solidity + OpenZeppelin v5 · Vitest.

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | What | Public? |
|----------|------|---------|
| `ROUTER_API_KEY` | 0G Compute Router key (from pc.0g.ai) | server-only |
| `ROUTER_BASE_URL` | `https://router-api-testnet.integratenetwork.work/v1` | server-only |
| `ROUTER_MODEL` | `qwen2.5-omni` | server-only |
| `PRIVATE_KEY` | Server wallet (funded on Galileo) for Storage gas | **server-only - never commit** |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed SoulAgent address | public |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect id (optional; MetaMask works without it) | public |

Get testnet 0G from the [faucet](https://faucet.0g.ai). Add the Galileo network
to your wallet: RPC `https://evmrpc-testnet.0g.ai`, chain ID `16602`, symbol `0G`.

```bash
npm test                                               # agent-core unit tests
node --env-file=.env.local scripts/smoke-compute.mjs   # verify 0G Compute
node --env-file=.env.local scripts/smoke-storage.mjs   # verify 0G Storage round-trip
```

---

## Roadmap (tournament meta: improve & resubmit)

- **Now (group stage):** create → chat (0G Compute) → memory (0G Storage) → mint
  (ERC-721) → reload-and-remember. ✅
- **Next:** full **ERC-7857 (INFT)** - encrypted, *transferable* memory, so handing
  over the NFT hands over the relationship.
- **Later:** agent marketplace, AI-generated avatars, agent-vs-agent.

---

## The contract

```solidity
function mint(string rootHash) external returns (uint256 tokenId); // → AgentMinted
function setMemory(uint256 tokenId, string rootHash) external;     // require(ownerOf == sender)
function memoryOf(uint256 tokenId) external view returns (string);
```

Minimal by design: the token carries a pointer to its memory on 0G Storage, and only
the holder can update it.
