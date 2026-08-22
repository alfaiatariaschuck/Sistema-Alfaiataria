import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, UserPlus } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill } from "../components/ui";
import DadosPessoaisCliente from "../components/DadosPessoaisCliente";
import CampoDadosPessoais, { dadosPessoaisVazio } from "../components/CampoDadosPessoais";
import { BRASS, BRASS_SOFT, INK, LINE, MEDIDAS_ALFAIATARIA, PECA_SECOES, STATUS_STYLE, TEXT_MUTED, inputStyle, rotuloMedida } from "../lib/constants";
import { brl, fmtData, mesesDesde } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_SUMIDO = "cliente_sumido_meses";
const VERMELHO = "#9C4A1E";

function medidasCamisaTexto(medidas) {
  return Object.entries(medidas || {}).filter(([, v]) => v !== "" && v != null);
}

function medidasPecaTexto(tipoPeca, medidas) {
  const secoes = PECA_SECOES[tipoPeca] || [];
  const linhas = [];
  secoes.forEach((secKey) => {
    const sec = MEDIDAS_ALFAIATARIA[secKey];
    if (!sec) return;
    sec.campos.forEach((campo) => {
      const v = medidas?.[secKey]?.[campo.label];
      if (v !== "" && v != null) linhas.push([campo.label, v]);
    });
  });
  return linhas;
}

export default function Clientes({ clientes, irParaPedido, irParaPeca, onCadastrar }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [limiteMeses, setLimiteMeses] = useState(6);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novosDados, setNovosDados] = useState(dadosPessoaisVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_SUMIDO).maybeSingle();
      if (data?.valor) setLimiteMeses(parseInt(data.valor, 10) || 6);
    })();
  }, []);

  const filtrados = clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  async function cadastrar(e) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCadastrar(novoNome, novosDados);
      setNovoNome("");
      setNovosDados(dadosPessoaisVazio());
      setMostrarForm(false);
    } catch (e) {
      setErro("Não consegui cadastrar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow={`${clientes.length} clientes`} title="Clientes" />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2" style={{ ...inputStyle, maxWidth: 320, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2"
          style={{ background: mostrarForm ? "#EDEAE0" : INK, color: mostrarForm ? INK : "#FFF", padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          {mostrarForm ? <Plus size={15} style={{ transform: "rotate(45deg)" }} /> : <UserPlus size={15} />}
          {mostrarForm ? "Cancelar" : "Cadastrar cliente"}
        </button>
      </div>

      {mostrarForm && (
        <Card style={{ padding: 20 }} className="mb-6">
          <form onSubmit={cadastrar}>
            <Field label="Nome do cliente">
              <input style={inputStyle} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" required />
            </Field>
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
              <CampoDadosPessoais value={novosDados} onChange={setNovosDados} />
            </div>
            {erro && (
              <div className="mt-3 px-4 py-2 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
                {erro}
              </div>
            )}
            <button
              type="submit"
              disabled={salvando}
              className="mt-4"
              style={{ background: INK, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: salvando ? 0.7 : 1 }}
            >
              {salvando ? "Cadastrando…" : "Cadastrar cliente"}
            </button>
          </form>
        </Card>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {filtrados.map((c) => {
          const pecas = c.pecas || [];
          const totalCamisas = c.pedidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
          const todosItens = [
            ...c.pedidos.map((p) => ({ tipo: "camisa", item: p, data: p.dataPedido })),
            ...pecas.map((p) => ({ tipo: "peca", item: p, data: p.dataPedido })),
          ].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
          const maisRecente = todosItens[0];
          const mesesSemComprar = maisRecente ? mesesDesde(maisRecente.data) : null;
          const sumido = mesesSemComprar !== null && mesesSemComprar >= limiteMeses;

          const devidoFabiana = c.pedidos
            .filter((p) => p.pagoFabiana.statusPagamento === "Pendente" && parseFloat(p.pagoFabiana.valor) > 0)
            .reduce((s, p) => s + parseFloat(p.pagoFabiana.valor), 0);
          const devidoIcaro = pecas
            .filter((p) => (parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0) > 0)
            .reduce((s, p) => s + ((parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0)), 0);

          const aberto = expandido === c.nome;
          const ultimasMedidas =
            maisRecente?.tipo === "camisa"
              ? medidasCamisaTexto(maisRecente.item.medidas)
              : maisRecente?.tipo === "peca"
              ? medidasPecaTexto(maisRecente.item.tipoPeca, maisRecente.item.medidas)
              : [];

          return (
            <Card key={c.nome} style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nome}</div>
                <div className="flex items-center gap-1.5">
                  {sumido && <Pill text={`sumido há ${mesesSemComprar}m`} style={{ bg: "#F6E3D9", fg: VERMELHO }} />}
                  {c.pedidos.length + pecas.length > 1 && <Pill text="↻ recompra" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2 flex-wrap" style={{ fontSize: 12, color: TEXT_MUTED }}>
                {c.pedidos.length > 0 && <span className="fx-mono">{totalCamisas} camisa(s)</span>}
                {pecas.length > 0 && <span className="fx-mono">{pecas.length} peça(s) de alfaiataria</span>}
              </div>
              {maisRecente && (
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>Último pedido ({fmtData(maisRecente.data)}):</span>
                  <Pill text={maisRecente.item.status} style={STATUS_STYLE[maisRecente.item.status]} />
                </div>
              )}
              {devidoFabiana > 0 && (
                <div className="mb-1" style={{ fontSize: 12, color: "#9C4A1E" }}>
                  Devendo à Fabiana: <strong>{brl(devidoFabiana)}</strong>
                </div>
              )}
              {devidoIcaro > 0 && (
                <div className="mb-2" style={{ fontSize: 12, color: "#9C4A1E" }}>
                  Devendo ao Icaro: <strong>{brl(devidoIcaro)}</strong>
                </div>
              )}

              <button
                onClick={() => setExpandido(aberto ? null : c.nome)}
                className="w-full flex items-center justify-between py-1.5"
                style={{ borderTop: `1px solid ${LINE}`, marginTop: 4 }}
              >
                <span style={{ fontSize: 12, color: BRASS, fontWeight: 600 }}>{aberto ? "Ocultar histórico" : "Ver histórico completo"}</span>
                {aberto ? <ChevronUp size={14} color={BRASS} /> : <ChevronDown size={14} color={BRASS} />}
              </button>

              {aberto && (
                <div className="pt-1">
                  {todosItens.map(({ tipo, item }) => (
                    <button
                      key={tipo + "-" + item.id}
                      onClick={() => (tipo === "camisa" ? irParaPedido(item.id) : irParaPeca(item.id))}
                      className="w-full flex items-center justify-between py-1.5"
                      style={{ borderTop: `1px solid ${LINE}` }}
                    >
                      <span style={{ fontSize: 12 }}>
                        {fmtData(item.dataPedido)} · {tipo === "camisa" ? "Camisa" : item.tipoPeca}
                      </span>
                      <Pill text={item.status} style={STATUS_STYLE[item.status]} />
                    </button>
                  ))}

                  {ultimasMedidas.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>
                        Últimas medidas salvas ({fmtData(maisRecente.data)}) — reaproveite numa recompra:
                      </div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                        {ultimasMedidas.map(([label, valor]) => (
                          <div key={label} className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                            {maisRecente.tipo === "camisa" ? rotuloMedida(label) : label}: <strong style={{ color: "#16212E" }}>{valor}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                    <DadosPessoaisCliente clienteId={c.id} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filtrados.length === 0 && <Empty texto="Nenhum cliente ainda — cadastre um pedido novo." />}
      </div>
    </div>
  );
}
