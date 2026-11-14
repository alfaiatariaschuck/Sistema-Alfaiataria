import React, { useMemo, useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import SeletorNomenclaturaTecido from "../components/SeletorNomenclaturaTecido";
import EstimativaCustoPeca from "../components/EstimativaCustoPeca";
import EstimativaCustoPedido from "../components/EstimativaCustoPedido";
import SeloMargem from "../components/SeloMargem";
import { BRASS, LINE, TEXT_MUTED, TIPOS_PECA, inputStyle } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, estimativaCustoPedidoCamisa, valorMetroDoEstoque } from "../lib/helpers";
import { custoMaoDeObraPeca, custoPorHoraAlfaiataria } from "../lib/custoEquipe";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";

const TIPO_CAMISA = "Camisa";
const TIPOS_ITEM = [...TIPOS_PECA, TIPO_CAMISA];

function tecidoVazio() {
  return { codigo: "", nomenclatura: "", qtd: 1, metragem: "", valorMetro: "" };
}

function itemVazio() {
  return { tipo: TIPOS_PECA[0], tecidos: [tecidoVazio()], valorVenda: "" };
}

let proximoId = 1;
function novoId() {
  return proximoId++;
}

// Calculadora de orçamento unificada (Alfaiataria + Camisaria) — pedido
// do Tales (14/11/2026): antes eram duas telas separadas, uma só pra
// peça de alfaiataria e outra só pra camisa; essa junta as duas, com
// quantas peças o orçamento do cliente precisar (ex.: um Costume + 2
// Camisas no mesmo orçamento). Cada peça tem seu próprio código de
// tecido (igual na ficha) e seu próprio valor de venda; o total embaixo
// soma tudo. Não salva nada no banco — some ao sair da aba. "Gerar
// orçamento" (virar PDF/mensagem pro cliente) é um ponto de melhoria
// futuro, ainda sem formato decidido — combinado com o Tales de deixar
// pra depois.
export default function Orcamento({
  pecas,
  equipe,
  custoAviamentosPorPecaBase = {},
  modelosAlfaiataria = [],
  onCriarModeloAlfaiataria,
  modelosCamisa = [],
  onCriarModeloCamisa,
  estoqueTecidos = [],
  modoApresentacao = false,
}) {
  const { metragemPadrao, maoDeObraPadrao, margemPadrao } = useConfigPrecoCamisa();
  const custoHora = useMemo(() => custoPorHoraAlfaiataria(pecas, equipe), [pecas, equipe]);
  const [itens, setItens] = useState(() => [{ id: novoId(), ...itemVazio() }]);

  function addItem() {
    setItens((prev) => [...prev, { id: novoId(), ...itemVazio() }]);
  }
  function removerItem(id) {
    setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }
  function setCampoItem(id, campo, valor) {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }
  function setTipoItem(id, tipo) {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, tipo, tecidos: [tecidoVazio()] } : it)));
  }
  function setTecidoItem(id, i, campo, valor) {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const tecidos = [...it.tecidos];
        tecidos[i] = { ...tecidos[i], [campo]: valor };
        return { ...it, tecidos };
      })
    );
  }
  function addTecidoItem(id) {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, tecidos: [...it.tecidos, tecidoVazio()] } : it)));
  }
  function removerTecidoItem(id, i) {
    setItens((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, tecidos: it.tecidos.length > 1 ? it.tecidos.filter((_, idx) => idx !== i) : it.tecidos } : it
      )
    );
  }
  function limpar() {
    setItens([{ id: novoId(), ...itemVazio() }]);
  }

  // Custo de cada peça — mesma conta usada nos pedidos de verdade
  // (Alfaiataria: tecido + aviamento da composição do tipo + mão de obra
  // rateada; Camisaria: a conta de Tecidos de Camisa) — só pra poder
  // somar tudo no total do orçamento, embaixo.
  const itensComCusto = useMemo(() => {
    return itens.map((it) => {
      let custo = 0;
      if (it.tipo === TIPO_CAMISA) {
        const custoAviamentoCamisa = custoAviamentosPorPecaBase["Camisa"] || 0;
        const { custoEstimado } = estimativaCustoPedidoCamisa(it.tecidos, modelosCamisa, {
          metragemPadrao,
          maoDeObraPadrao,
          margemPadrao,
          custoAviamentoCamisa,
        });
        custo = custoEstimado || 0;
      } else {
        custo = custoTecidoDe(it.tecidos) + custoAviamentoComposicao(it.tipo, custoAviamentosPorPecaBase) + custoMaoDeObraPeca(it.tipo, custoHora);
      }
      return { ...it, custo, venda: parseFloat(it.valorVenda) || 0 };
    });
  }, [itens, custoAviamentosPorPecaBase, modelosCamisa, metragemPadrao, maoDeObraPadrao, margemPadrao, custoHora]);

  const totais = useMemo(
    () => itensComCusto.reduce((acc, it) => ({ custo: acc.custo + it.custo, venda: acc.venda + it.venda }), { custo: 0, venda: 0 }),
    [itensComCusto]
  );
  const margemTotal = totais.venda - totais.custo;
  const margemTotalPct = totais.venda > 0 ? (margemTotal / totais.venda) * 100 : null;

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria + Camisaria" title="Orçamento" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Monte o orçamento completo do cliente, misturando peças de alfaiataria e camisas no mesmo orçamento — essa
        tela não salva nada no sistema. Adicione quantas peças precisar; o total embaixo soma tudo.
      </div>

      {itensComCusto.map((it) => (
        <Card key={it.id} style={{ padding: 20 }} className="mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <Field label="Tipo">
              <select style={{ ...inputStyle, maxWidth: 180 }} value={it.tipo} onChange={(e) => setTipoItem(it.id, e.target.value)}>
                {TIPOS_ITEM.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            {itensComCusto.length > 1 && (
              <button type="button" onClick={() => removerItem(it.id)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                remover peça
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>
              Tecido
            </div>
            <button type="button" onClick={() => addTecidoItem(it.id)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
              + adicionar tecido
            </button>
          </div>

          {it.tecidos.map((t, i) => (
            <div key={i} className="mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  style={{ ...inputStyle, maxWidth: 110 }}
                  placeholder="Código"
                  value={t.codigo}
                  onChange={(e) => {
                    const novoCodigo = e.target.value;
                    setTecidoItem(it.id, i, "codigo", novoCodigo);
                    if (t.valorMetro === "" || t.valorMetro == null) {
                      const preco = valorMetroDoEstoque(novoCodigo, estoqueTecidos);
                      if (preco) setTecidoItem(it.id, i, "valorMetro", preco);
                    }
                  }}
                />
                <SeletorNomenclaturaTecido
                  value={t.nomenclatura}
                  onChange={(nome) => setTecidoItem(it.id, i, "nomenclatura", nome)}
                  modelos={it.tipo === TIPO_CAMISA ? modelosCamisa : modelosAlfaiataria}
                  onCriarModelo={it.tipo === TIPO_CAMISA ? onCriarModeloCamisa : onCriarModeloAlfaiataria}
                  onValorReferencia={(valor) => {
                    if (t.valorMetro === "" || t.valorMetro == null) setTecidoItem(it.id, i, "valorMetro", valor);
                  }}
                />
                {it.tipo === TIPO_CAMISA && (
                  <input
                    type="number"
                    min="1"
                    style={{ ...inputStyle, maxWidth: 70 }}
                    placeholder="Qtd"
                    value={t.qtd}
                    onChange={(e) => setTecidoItem(it.id, i, "qtd", e.target.value)}
                  />
                )}
                <input
                  style={{ ...inputStyle, maxWidth: 110 }}
                  placeholder="Medida (ex: 1,5m)"
                  value={t.metragem}
                  onChange={(e) => setTecidoItem(it.id, i, "metragem", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, maxWidth: 110 }}
                  placeholder="R$/metro"
                  value={t.valorMetro}
                  onChange={(e) => setTecidoItem(it.id, i, "valorMetro", e.target.value)}
                />
                {it.tecidos.length > 1 && (
                  <button type="button" onClick={() => removerTecidoItem(it.id, i)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    remover
                  </button>
                )}
              </div>
              {estoqueTecidos && estoqueTecidos.some((e) => e.codigo.trim().toLowerCase() === (t.codigo || "").trim().toLowerCase()) && (
                <div className="mt-2 p-2" style={{ background: "#F3EEDF", borderRadius: 6, fontSize: 11, color: TEXT_MUTED }}>
                  Esse código tem estoque cadastrado.
                </div>
              )}
            </div>
          ))}

          <div className="mt-3" style={{ maxWidth: 220 }}>
            <Field label="Valor de venda dessa peça (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={it.valorVenda}
                onChange={(e) => setCampoItem(it.id, "valorVenda", e.target.value)}
              />
            </Field>
          </div>

          {it.tipo === TIPO_CAMISA ? (
            <EstimativaCustoPedido
              tecidos={it.tecidos}
              modelosCamisa={modelosCamisa}
              custoAviamentosPorPecaBase={custoAviamentosPorPecaBase}
              metragemPadrao={metragemPadrao}
              maoDeObraPadrao={maoDeObraPadrao}
              margemPadrao={margemPadrao}
              valorVenda={it.valorVenda}
              onUsarSugestao={(v) => setCampoItem(it.id, "valorVenda", v)}
              modoApresentacao={modoApresentacao}
            />
          ) : (
            <EstimativaCustoPeca
              tecidos={it.tecidos}
              tipoPeca={it.tipo}
              custoAviamentosPorPecaBase={custoAviamentosPorPecaBase}
              custoHora={custoHora}
              valorVenda={it.valorVenda}
              modoApresentacao={modoApresentacao}
            />
          )}
        </Card>
      ))}

      <button type="button" onClick={addItem} className="mb-5" style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
        + adicionar peça
      </button>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 600 }}>
          Total do orçamento
        </div>
        {modoApresentacao ? (
          <SeloMargem margemPercentual={margemTotalPct} />
        ) : (
          <>
            <div style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>
              Informações gerenciais
            </div>
            <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 13 }}>
              <span>
                <span style={{ color: TEXT_MUTED }}>Custo total estimado: </span>
                <strong className="fx-mono">{brl(totais.custo)}</strong>
              </span>
              <span>
                <span style={{ color: TEXT_MUTED }}>Soma do valor de venda: </span>
                <strong className="fx-mono">{brl(totais.venda)}</strong>
              </span>
              {totais.venda > 0 && (
                <>
                  <span>
                    <span style={{ color: TEXT_MUTED }}>Margem total: </span>
                    <strong className="fx-mono" style={{ color: margemTotal >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                      {brl(margemTotal)} ({margemTotalPct.toFixed(0)}%)
                    </strong>
                  </span>
                  <SeloMargem margemPercentual={margemTotalPct} />
                </>
              )}
            </div>
          </>
        )}
      </Card>

      <button type="button" onClick={limpar} style={{ color: TEXT_MUTED, fontSize: 12, textDecoration: "underline" }}>
        limpar e começar outro orçamento
      </button>
    </div>
  );
}
