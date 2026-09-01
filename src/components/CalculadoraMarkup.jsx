import React, { useState } from "react";
import { Card } from "./ui";
import { BRASS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

// Calculadora de preço mínimo por peça/camisa — parte do custo fixo do mês
// (equipe + estrutura + fatia rateada dos custos compartilhados) dividido
// pela quantidade vendida, soma o custo variável médio (tecido/aviamentos
// ou o que é pago ao terceirizado) e aplica a margem desejada.
// Os valores iniciais vêm do mês atual, mas ficam editáveis — é só uma
// simulação, não precisa recalcular sozinha se o mês mudar.
export function CalculadoraMarkup({ custoFixoMes, qtdPadrao, custoVariavelPadrao, unidadeLabel = "peça" }) {
  const [qtd, setQtd] = useState(qtdPadrao || 1);
  const [custoVariavel, setCustoVariavel] = useState(Math.round((custoVariavelPadrao || 0) * 100) / 100);
  const [margem, setMargem] = useState(30);

  const qtdSegura = parseFloat(qtd) || 0;
  const custoFixoPorUnidade = qtdSegura > 0 ? custoFixoMes / qtdSegura : 0;
  const custoVariavelSeguro = parseFloat(custoVariavel) || 0;
  const custoTotalPorUnidade = custoFixoPorUnidade + custoVariavelSeguro;
  const margemSegura = Math.min(parseFloat(margem) || 0, 99);
  const precoMinimo = custoTotalPorUnidade / (1 - margemSegura / 100);

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        Calculadora de preço mínimo
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
        Pega o custo fixo do mês (equipe + estrutura + sua fatia dos custos compartilhados) e divide pela quantidade
        vendida — o resto é simulação sua: custo variável médio por {unidadeLabel} e a margem que você quer.
      </div>
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>{unidadeLabel === "peça" ? "Peças" : "Camisas"} vendidas/mês (estimativa)</div>
          <input type="number" min="0" step="1" style={inputStyle} value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Custo variável médio/{unidadeLabel} (R$)</div>
          <input type="number" min="0" step="0.01" style={inputStyle} value={custoVariavel} onChange={(e) => setCustoVariavel(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Margem de lucro desejada (%)</div>
          <input type="number" min="0" max="99" step="1" style={inputStyle} value={margem} onChange={(e) => setMargem(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo fixo por {unidadeLabel}</div>
          <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoFixoPorUnidade)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo total por {unidadeLabel}</div>
          <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoTotalPorUnidade)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Preço mínimo sugerido</div>
          <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: BRASS }}>{brl(precoMinimo)}</div>
        </div>
      </div>
    </Card>
  );
}
