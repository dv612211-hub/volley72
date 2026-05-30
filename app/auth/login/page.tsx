"use client";

const VK_CLIENT_ID = "54611008";
const REDIRECT_URI = "https://volley72.ru/auth/callback";
const vkAuthUrl = `https://id.vk.com/oauth2/authorize?client_id=${VK_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=vkid.personal_info`;

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1535",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          Volley<span style={{ color: "#f97316" }}>72</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16 }}>Войдите чтобы продолжить</p>
      </div>
      
        href={vkAuthUrl}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          width: "100%",
          maxWidth: 360,
          padding: "14px 24px",
          background: "#0077FF",
          color: "#fff",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-.496-1.49.495v1.548c0 .33-.165.495-.825.495h-.825c-2.474 0-5.279-1.484-7.173-4.288C3.135 10.43 2.64 8.233 2.64 7.903c0-.33.165-.495.495-.495h1.744c.495 0 .66.165.826.66.825 2.474 2.234 4.618 2.8 4.618.22 0 .33-.11.33-.716V9.233c-.055-1.293-.77-1.403-.77-1.843 0-.22.165-.44.44-.44h2.748c.385 0 .495.22.495.66v3.52c0 .384.165.494.275.494.22 0 .385-.11.77-.495 1.21-1.348 2.07-3.41 2.07-3.41.11-.33.385-.66.88-.66h1.744c.55 0 .66.275.55.66-.22 1.1-2.364 4.068-2.364 4.068-.165.275-.22.385 0 .66.165.22.715.715 1.1 1.155.715.77 1.21 1.43 1.375 1.87.165.44-.055.66-.55.66z"/>
        </svg>
        Войти через VK
      </a>
      <a href="/" style={{ marginTop: 24, color: "#64748b", fontSize: 14, textDecoration: "none" }}>
        ← На главную
      </a>
    </div>
  );
}
