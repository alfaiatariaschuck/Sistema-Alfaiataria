import React, { useMemo, useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import SeletorNomenclaturaTecido from "../components/SeletorNomenclaturaTecido";
import EstimativaCustoPeca from "../components/EstimativaCustoPeca";
import { BRASS, LINE, TEXT_MUTED, TIPOS_PECA, inputStyle } from "../lib/constants";
import { custoPorHoraAlfaiataria } from "../lib/custoEquipe";

function tecidoVazio() {
  return { nomenclatura: "", metragem: "", valorMetro: "" };
}

// Calculadora rápida de orçamento — mesma conta de custo (tecido +
// aviamento da composição do tipo de peça + mão de obra real da
// equipe) já usada em "Pedido Alfaiataria", só que sem precisar criar
// uma peça de verdade: é pra simular a margem de um orçamento antes de
// fechar com o cliente. Não salva nada no banco — some ao sair da aba.
export default function Orcamento({ pecas, equipe, custoAviamentosPorPecaBase = {}, modelosAlfaiataria = [], onCriarModeloAlfaiataria }) {
  const [tipoPeca, setTipoPeca] = useState(TIPOS_PECA[0]);
  const [tecidos, setTecidos] = useState([tecidoVazio()]);
  const [valorVenda, setValorVenda] = useState("");
  const custoHora = useMemo(() => custoPorHoraAlfaiataria(pecas, equipe), [pecas, equipe]);

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
    setTipoPeca(TIPOS_PECA[0]);
    setTecidos([tecidoVazio()]);
    setValorVenda("");
  }

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria" title="Orçamento" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Simule a margem de um pedido antes de fechar com o cliente — essa tela não salva nada no sistema.
      </div>

      <Card style={{ padding: 20 }} className="mb-5">
        <Field label="Tipo de peça">
          <select style={inputStyle} value={tipoPeca} onChange={(e) => setTipoPeca(e.target.value)}>
            {TIPOS_PECA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Tecido
          </div>
          <button type="button" onClick={addTecido} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
            + adicionar item
          </button>
        </div>

        {tecidos.map((t, i) => (
          <div key={i} className="mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              <SeletorNomenclaturaTecido
                value={t.nomenclatura}
                onChange={(nome) => setTecido(i, "nomenclatura", nome)}
                modelos={modelosAlfaiataria}
                onCriarModelo={onCriarModeloAlfaiataria}
                onValorReferencia={(valor) => {
                  if (t.valorMetro === "" || t.valorMetro == null) setTecido(i, "valorMetro", valor);
                }}
              />
              <input
                style={{ ...inputStyle, maxWidth: 110 }}
                placeholder="Metragem (ex: 3,5m)"
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

        <EstimativaCustoPeca
          tecidos={tecidos}
          tipoPeca={tipoPeca}
          custoAviamentosPorPecaBase={custoAviamentosPorPecaBase}
          custoHora={custoHora}
          valorVenda={valorVenda}
        />

        <button type="button" onClick={limpar} className="mt-4" style={{ color: TEXT_MUTED, fontSize: 12, textDecoration: "underline" }}>
          limpar e começar outro orçamento
        </button>
      </Card>
    </div>
  );
}
