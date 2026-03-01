"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  id: number;
  title: string;
  price: string;
  createdBy: string;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const router = useRouter();

  const userId = typeof window !== "undefined"
    ? localStorage.getItem("userName") || "anonimo"
    : "anonimo";

  const fetchOffers = async () => {
    try {
      const res = await fetch("https://notifica-back.vercel.app/api/offers");
      const data = await res.json();
      setOffers(data);
    } catch (error) {
      console.error("Error cargando ofertas:", error);
    }
  };

  const saveOffer = async () => {
    if (!title || !price) {
      alert("Completa todos los campos");
      return;
    }
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `https://notifica-back.vercel.app/api/offers/${editingId}`
        : "https://notifica-back.vercel.app/api/offers";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price, createdBy: userId }),
      });

      if (res.ok) {
        setTitle("");
        setPrice("");
        setEditingId(null);
        fetchOffers();
      }
    } catch (error) {
      console.error("Error guardando oferta:", error);
    }
  };

  const deleteOffer = async (id: number) => {
    if (!confirm("¿Seguro que querés eliminar esta oferta?")) return;
    try {
      const res = await fetch(`https://notifica-back.vercel.app/api/offers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchOffers();
    } catch (error) {
      console.error("Error eliminando oferta:", error);
    }
  };

  const editOffer = (offer: Offer) => {
    setTitle(offer.title);
    setPrice(offer.price);
    setEditingId(offer.id);
  };

  const showToast = (title: string, body: string) => {
    setToast({ title, body });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchOffers();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_OFFER") {
          showToast(event.data.title, event.data.body);
          fetchOffers();
        }
      });
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* 🏠 Botón casa */}
        <button onClick={() => router.push("/")} style={styles.homeButton}>
          🏠 Volver
        </button>

        <h1 style={styles.header}>
          {editingId ? "✏️ Editar oferta" : "🔥 Crear nueva oferta"}
        </h1>

        <input
          style={styles.input}
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Precio"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button style={styles.button} onClick={saveOffer}>
          {editingId ? "Guardar cambios" : "Crear oferta"}
        </button>

        <hr style={{ margin: "20px 0" }} />

        <h2 style={styles.header}>🔥 Ofertas disponibles</h2>

        {offers.length === 0 ? (
          <p style={styles.empty}>No hay ofertas aún</p>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} style={styles.offer}>
              <div>
                <h3 style={styles.offerTitle}>{offer.title}</h3>
                <p style={styles.offerPrice}>Precio: ${offer.price}</p>
                {/* 👤 Nombre del creador */}
                <p style={styles.createdBy}>por {offer.createdBy}</p>
              </div>

              {offer.createdBy === userId && (
                <div style={styles.actions}>
                  <button style={styles.editButton} onClick={() => editOffer(offer)}>
                    ✏️ Editar
                  </button>
                  <button style={styles.deleteButton} onClick={() => deleteOffer(offer.id)}>
                    🗑 Eliminar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {toast && (
        <div style={styles.toast}>
          <strong>{toast.title}</strong>
          <p>{toast.body}</p>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: "100vh",
    padding: "10px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  homeButton: {
    padding: "8px 16px",
    backgroundColor: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "16px",
  },
  header: {
    color: "#111",
    marginBottom: "15px",
    fontSize: "20px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    color: "#111",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
  },
  offer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #e5e7eb",
    padding: "15px",
    borderRadius: "8px",
    marginTop: "10px",
  },
  offerTitle: { margin: 0, color: "#111", fontSize: "16px" },
  offerPrice: { margin: "5px 0 0 0", color: "#111", fontWeight: "bold" },
  createdBy: { margin: "4px 0 0 0", color: "#6b7280", fontSize: "13px" },
  actions: { display: "flex", gap: "10px", flexShrink: 0 },
  editButton: {
    backgroundColor: "#f59e0b",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  empty: {
    color: "#555",
    textAlign: "center",
    marginTop: "20px",
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
    zIndex: 9999,
  },
};