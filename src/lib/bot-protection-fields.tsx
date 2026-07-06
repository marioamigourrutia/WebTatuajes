"use client";

import { useState } from "react";
import { botProtectionFields } from "./bot-protection";

export function BotProtectionFields() {
  const [submittedAt] = useState(() => Date.now().toString());

  return (
    <div aria-hidden="true" className="hidden">
      <label>
        Sitio web
        <input autoComplete="off" name={botProtectionFields.honeypot} tabIndex={-1} type="text" />
      </label>
      <input
        name={botProtectionFields.submittedAt}
        type="hidden"
        value={submittedAt}
        readOnly
        suppressHydrationWarning
      />
    </div>
  );
}
