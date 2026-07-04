'use client';

export function ShareButton({ tokenId, name }: { tokenId: bigint | string; name: string }) {
  const url = `https://0g-soul.vercel.app/agent/${tokenId}`;
  const text = `Meet ${name} — my AI companion I own on 0G. Its memory lives on-chain 🧠⛓️`;
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="term-btn rounded-sm px-4 py-2 text-sm">
      share to X ◈
    </a>
  );
}
