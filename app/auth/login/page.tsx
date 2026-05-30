"use client";

const VK_CLIENT_ID = "54611008";
const REDIRECT_URI = "https://volley72.ru/auth/callback";
const vkAuthUrl = "https://id.vk.com/oauth2/authorize?client_id=" + VK_CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) + "&response_type=code&scope=vkid.personal_info";

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
          display: "block",
          width: "100%",
          maxWidth: 360,
          padding: "14px 24px",
          background: "#0077FF",
          color: "#fff",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
          textAlign: "center",
        }}
      >
        Войти через VK
      </a>
      <a href="/" style={{ marginTop: 24, color: "#64748b", fontSize: 14, textDecoration: "none" }}>
        На главную
      </a>
    </div>
  );
}
