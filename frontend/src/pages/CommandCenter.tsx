import { useNavigate } from "react-router-dom";

export default function CommandCenter() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#090b0f",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <h1>CASCADE Command Center</h1>

      <p style={{ color: "#8a929d" }}>
        Interactive infrastructure system coming next.
      </p>

      <button
        onClick={() => navigate("/")}
        style={{
          border: "1px solid #333",
          background: "#11161d",
          color: "white",
          padding: "12px 18px",
          borderRadius: "999px",
        }}
      >
        Back
      </button>
    </div>
  );
}