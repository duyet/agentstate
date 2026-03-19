import { useEffect, useState } from "react";

export function _useNewKeyStorage(slug: string | null) {
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const storedKey = sessionStorage.getItem(`new_key_${slug}`);
    if (storedKey) {
      setCreatedKey(storedKey);
      sessionStorage.removeItem(`new_key_${slug}`);
    }
  }, [slug]);

  return { createdKey, setCreatedKey };
}
