import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "Page not found — The Block";
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Back to listings
      </Link>
    </div>
  );
}
