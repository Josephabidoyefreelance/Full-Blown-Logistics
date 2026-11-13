import React from "react";

type JaadLegalHeaderProps = {
  title: string;
  onClose?: () => void;
};

/**
 * JAAD legal-document header.
 * Uses the original public/jaad-logo.png asset.
 */
export default function JaadLegalHeader({
  title,
  onClose,
}: JaadLegalHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 58,
        padding: "8px 16px",
        background: "#000",
        color: "#fff",
        borderBottom: "1px solid #222",
        boxSizing: "border-box",
      }}
    >
      <img
        src="/jaad-logo.png"
        alt="JAAD Logistics"
        style={{
          display: "block",
          width: 88,
          height: 42,
          objectFit: "contain",
          objectPosition: "left center",
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          flex: 1,
          textAlign: "center",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.2,
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      {onClose ? (
        <button
          type="button"
          aria-label="Close document"
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            border: 0,
            background: "transparent",
            color: "#fff",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          ×
        </button>
      ) : (
        <span aria-hidden="true" style={{ width: 30, flex: "0 0 auto" }} />
      )}
    </header>
  );
}
