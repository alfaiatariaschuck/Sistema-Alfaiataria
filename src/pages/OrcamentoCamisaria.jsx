import React, { useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import SeletorNomenclaturaTecido from "../components/SeletorNomenclaturaTecido";
import EstimativaCustoPedido from "../components/EstimativaCustoPedido";
import { TEXT_MUTED, inputStyle } from "../lib/constants";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";

function tecidoVazio() {
  return { nomenclatura: "", qtd: 1, metragem: "", valorMetro: "" };
}

// Mesma ideia do Orçamento de Alfaiataria — simula a margem de um pedido
// de camisa antes de fechar com o cliente, sem precisar lançar um pedido
// de verdade. Reaproveita a mesma conta já usada em Novo Pedido Camisas
// (EstimativaCustoPedido): tecido (real, se preenchido, ou estimado pela
// Tabela de preço de venda) + aviamento da camisa + mão de obra padrão.
export default function OrcamentoCamisaria({ modelosCamisa = [], onCriarModeloCamisa, custoAviamentosPorPecaBase = {} }) {
  const { metragemPadrao, maoDeObraPadrao, margemPadrao } = useConfigPrecoCamisa();
  const [tecidos, setTecidos] = useState([tecidoVazio()]);
  const [valorVenda, setValorVenda] = useState("");

  function setTecido(i, campo, valor) {
    setTecidos((prev) => {
      const t = [...prev];
      t[i] = { ...t[i], [campo]: valor };
      return t;
    });
  }

  function addTecido() {
    setTecidos((prev) => [...prev, tecidoVazio()]);
  }

  function removerTecido(i) {
    setTecidos((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function limpar() {
    setTecidos([tecidoVazio()]);
    setValorVenda("");
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria" title="Orçamento" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Simule a margem de um pedido de camisa antes de fechar com o cliente — essa tela não salva nada no sistema.
      </div>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Tecido
          </div>
          <button type="button" onClick={addTecido} style={{ color: "#BFA06A", fontSize: 13, fontWeight: 600 }}>
            + adicionar item
          </button>
        </div>

        {tecidos.map((t, i) => (
          <div key={i} className="mb-2 pb-2" style={{ borderBottom: "1px solid #E7E0D2" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <SeletorNomenclaturaTecido
                value={t.nomenclatura}
                onChange={(nome) => setTecido(i, "nomenclatura", nome)}
                modelos={modelosCamisa}
                onCriarModelo={onCriarModeloCamisa}
                onValorReferencia={(valor) => {
                  if (t.valorMetro === "" || t.valorMetro == null) setTecido(i, "valorMetro", valor);
                }}
              />
              <input
                type="number"
                min="1"
                style={{ ...inputStyle, maxWidth: 80 }}
                placeholder="Qtd"
                value={t.qtd}
                onChange={(e) => setTecido(i, "qtd", e.target.value)}
              />
              <input
                style={{ ...inputStyle, maxWidth: 110 }}
                placeholder="Medida (ex: 1,5m)"
                value={t.metragem}
                onChange={(e) => setTecido(i, "metragem", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ ...inputStyle, maxWidth: 110 }}
                placeholder="R$/metro"
                value={t.valorMetro}
                onChange={(e) => setTecido(i, "valorMetro", e.target.value)}
              />
              {tecidos.length > 1 && (
                <button type="button" onClick={() => removerTecido(i)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                  remover
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="mt-4" style={{ maxWidth: 220 }}>
          <Field label="Valor de venda (R$) — opcional, pra ver a margem">
            <input
              type="number"
              min="0"
              step="0.01"
              style={inputStyle}
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
            />
          </Field>
        </div>

        <EstimativaCustoPedido
          tecidos={tecidos}
          modelosCamisa={modelosCamisa}
          custoAviamentosPorPecaBase={custoAviamentosPorPecaBase}
          metragemPadrao={metragemPadrao}
          maoDeObraPadrao={maoDeObraPadrao}
          margemPadrao={margemPadrao}
          valorVenda={valorVenda}
          onUsarSugestao={(v) => setValorVenda(v)}
        />

        <button type="button" onClick={limpar} className="mt-4" style={{ color: TEXT_MUTED, fontSize: 12, textDecoration: "underline" }}>
          limpar e começar outro orçamento
        </button>
      </Card>
    </div>
  );
}
