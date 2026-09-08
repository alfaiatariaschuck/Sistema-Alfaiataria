import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "./ui";
import { INK, TEXT_MUTED, inputStyle } from "../lib/constants";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";

const VERMELHO = "#9C4A1E";
const AMARELO_BG = "#FCEFC7";

// Painel de gerenciamento pra "ir abatendo" os pedidos de camisa em
// produção sem valor da Fabiana lançado — sem isso, a despesa dela não
// sai sozinha em Contas a Pagar (criarDespesaFabianaSeNecessario exige
// valor > 0). Antes disso só dava pra descobrir um pedido com esse
// problema abrindo cada um, um por um — aqui aparecem todos juntos,
// numa lista só, pra resolver de uma vez.
export default function PendenciasFabiana({ pedidos, onDefinirValorPorCamisaFabiana, onSelecionar }) {
  const { maoDeObraPadrao } = useConfigPrecoCamisa();
  const [valores, setValores] = useState({});
  const [lancando, setLancando] = useState(null);

  // Só entram pedidos que já deveriam ter passado pelo lançamento da
  // despesa (produção já começou) — "Aguardando Produção" ainda nem
  // chegou nesse ponto, então não é pendência de verdade ainda.
  const STATUS_JA_EM_PRODUCAO = ["Em Produção", "Prova", "Pronto", "Entregue Parcial"];
  const pendentes = (pedidos || []).filter(
    (p) => STATUS_JA_EM_PRODUCAO.includes(p.status) && !(parseFloat(p.pagoFabiana?.valor) > 0)
  );

  if (!pendentes.length) return null;

  const sugestaoPadrao = parseFloat(maoDeObraPadrao) > 0 ? parseFloat(maoDeObraPadrao).toFixed(2) : "";

  async function lancar(p) {
    const valor = valores[p.id] ?? sugestaoPadrao;
    if (!(parseFloat(valor) > 0)) return;
    setLancando(p.id);
    try {
      await onDefinirValorPorCamisaFabiana(p.id, valor);
    } finally {
      setLancando(null);
    }
  }

  return (
    <Card style={{ padding: 16, marginBottom: 16, border: `1px solid ${VERMELHO}` }}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} color={VERMELHO} />
        <strong style={{ color: VERMELHO, fontSize: 14 }}>
          {pendentes.length} pedido(s) sem valor da Fabiana lançado
        </strong>
      </div>
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>
        Sem esse valor, a despesa dela não sai sozinha em Contas a Pagar ao marcar "Em Produção". Preencha o valor
        por camisa de cada um abaixo e clique em Lançar — o total (valor × quantidade) e a despesa saem sozinhos.
      </div>
      <div className="flex flex-col gap-2">
        {pendentes.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap" style={{ background: AMARELO_BG, borderRadius: 6, padding: "8px 10px" }}>
            <button type="button" onClick={() => onSelecionar(p.id)} className="text-left" style={{ fontSize: 13 }}>
              <strong style={{ color: INK }}>{p.cliente || "Sem nome"}</strong>{" "}
              <span style={{ color: TEXT_MUTED }}>
                · {p.quantidade || 0} un · {p.status}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>R$/camisa</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={sugestaoPadrao || "0,00"}
                value={valores[p.id] ?? sugestaoPadrao}
                onChange={(e) => setValores((prev) => ({ ...prev, [p.id]: e.target.value }))}
                style={{ ...inputStyle, width: 90, padding: "5px 8px", fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => lancar(p)}
                disabled={lancando === p.id}
                style={{ background: VERMELHO, color: "#FFF", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: lancando === p.id ? 0.7 : 1 }}
              >
                {lancando === p.id ? "Lançando…" : "Lançar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
