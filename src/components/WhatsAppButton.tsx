"use client";

import { MessageCircle } from "lucide-react";

type WhatsAppButtonProps = {
  message: string;
  entityType?: string;
  entityId?: string;
  label?: string;
  className?: string;
};

export function WhatsAppButton({
  message,
  entityType,
  entityId,
  label = "שלח ב-WhatsApp",
  className = "",
}: WhatsAppButtonProps) {
  const send = async () => {
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, entityType, entityId }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  return (
    <button
      type="button"
      onClick={send}
      className={`flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-white font-semibold hover:bg-[#1da851] transition-colors ${className}`}
    >
      <MessageCircle className="h-5 w-5" />
      {label}
    </button>
  );
}
