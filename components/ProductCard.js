import Link from "next/link";

export default function ProductCard({ p }) {
  return (
    <Link href={`/products/${p._id}`} className="card">
      <div className="emoji">{p.emoji}</div>
      <h3>{p.name}</h3>
      <p className="price">${p.price.toFixed(2)}</p>
    </Link>
  );
}
