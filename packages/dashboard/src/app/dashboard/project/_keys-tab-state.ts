import { useState } from "react";

export function _useKeysTabState() {
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  return {
    showCreateKey,
    newKeyName,
    setShowCreateKey,
    setNewKeyName,
    resetKeyForm: () => {
      setShowCreateKey(false);
      setNewKeyName("");
    },
  };
}
