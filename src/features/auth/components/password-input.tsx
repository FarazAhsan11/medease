"use client";

import { useState } from "react";

import { authFieldClass } from "@/features/auth/lib/field-styles";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        type={visible ? "text" : "password"}
        name="password"
        required
        aria-label="Password"
        placeholder="Password"
        className={authFieldClass}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2.5 mb-2.5 text-[13px]"
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
