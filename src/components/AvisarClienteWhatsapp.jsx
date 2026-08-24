import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { TEXT_MUTED } from "../lib/constants";
import { supabase } from "../supabaseClient";

// Botão "Avisar cliente" — abre o WhatsApp com a mensagem já escrita,
// mas quem clica em enviar é você (não é envio automático, não tem
// custo nenhum de API). Só aparece se o cliente tiver telefone salvo
// no CRM (aba Clientes).
export default function AvisarClienteWhatsapp({ clienteId, nomeCliente, mensagem }) {
  const [telefone, setTelefone] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!clienteId) {
      setCarregando(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("clientes_dados_pessoais").select("telefone").eq("cliente_id", clienteId).maybeSingle();
      setTelefone(data?.telefone || null);
      setCarregando(false);
    })();
  }, [clienteId]);

  if (carregando) return null;

  if (!telefone) {
    return (
      <span style={{ fontSize: 12, color: TEXT_MUTED }}>
        Telefone de {nomeCliente} não cadastrado — adicione em Clientes pra poder avisar por WhatsApp.
      </span>
    );
  }

  const digitos = telefone.replace(/\D/g, "");
  const url = `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2"
      style={{ background: "#25D366", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, width: "fit-content" }}
    >
      <MessageCircle size={15} /> Avisar {nomeCliente} pelo WhatsApp
    </a>
  );
}
