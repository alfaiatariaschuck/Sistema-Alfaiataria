import React, { useEffect, useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import CampoAutocomplete from "../components/CampoAutocomplete";
import AvisoClienteParecido from "../components/AvisoClienteParecido";
import CampoDadosPessoais, { dadosPessoaisVazio } from "../components/CampoDadosPessoais";
import { BRASS, INK, LINE, STATUS_SAPATOS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { pedidoSapatoVazio } from "../hooks/usePedidosSapatos";

export default function PedidoSapatos({ onCriar, nomesClientes, modelos }) {
  const [pedido, setPedido] = useState(pedidoSapatoVazio());
  const [dadosPessoais, setDadosPessoais] = useState(dadosPessoaisVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [personalizacaoAuto, setPersonalizacaoAuto] = useState("");

  const modelosUnicos = [...new Set((modelos || []).map((m) => m.modelo))];
  const materiaisUnicos = [...new Set((modelos || []).map((m) => m.material))];
  const coresUnicas = [...new Set((modelos || []).map((m) => m.cor))];
  const numeracoesUnicas = [...new Set((modelos || []).map((m) => m.numeracao))].sort((a, b) => Number(a) - Number(b));

  // Personalização vem preenchida igual ao nome do cliente — só continua
  // acompanhando enquanto o Tales não tiver editado ela na mão (mesma
  // ideia da previsão de entrega sugerida em Pedido Alfaiataria).
  useEffect(() => {
    setPedido((prev) => {
      const aindaEhSugestao = prev.personalizacao === "" || prev.personalizacao === personalizacaoAuto;
      return aindaEhSugestao ? { ...prev, personalizacao: prev.cliente } : prev;
    });
    setPersonalizacaoAuto(pedido.cliente);
    // eslint-disable-next-line
  }, [pedido.cliente]);

  async function submeter(e) {
    e.preventDefault();
    if (!pedido.cliente.trim() || !pedido.modelo.trim() || !pedido.numeracao.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCriar({ ...pedido, dadosPessoais });
      setPedido(pedidoSapatoVazio());
      setDadosPessoais(dadosPessoaisVazio());
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Parceria com fornecedor" title="Novo Pedido — Sapatos" />

      <form onSubmit={submeter}>
        <Card style={{ padding: 20 }} className="mb-5">
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Field label="Cliente">
              <CampoAutocomplete
                value={pedido.cliente}
                onChange={(v) => setPedido({ ...pedido, cliente: v })}
                opcoes={nomesClientes || []}
                required
              />
              <AvisoClienteParecido nome={pedido.cliente} nomesClientes={nomesClientes} onEscolher={(nome) => setPedido({ ...pedido, cliente: nome })} />
            </Field>
            <Field label="Vendedor">
              <div className="flex gap-2">
                {["Tales", "Deivid"].map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setPedido({ ...pedido, vendedor: v })}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      border: `1px solid ${LINE}`,
                      background: pedido.vendedor === v ? INK : "transparent",
                      color: pedido.vendedor === v ? "#FFF" : INK,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Data do pedido">
              <input type="date" style={inputStyle} value={pedido.dataPedido} onChange={(e) => setPedido({ ...pedido, dataPedido: e.target.value })} />
            </Field>
          </div>

          <div className="mt-2 pt-4 mb-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <div className="fx-serif mb-3" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
              Pedido
            </div>
            <datalist id="lista-modelos-sapato">
              {modelosUnicos.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <datalist id="lista-materiais-sapato">
              {materiaisUnicos.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <datalist id="lista-cores-sapato">
              {coresUnicas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="lista-numeracoes-sapato">
              {numeracoesUnicas.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <Field label="Modelo">
                <input style={inputStyle} list="lista-modelos-sapato" value={pedido.modelo} onChange={(e) => setPedido({ ...pedido, modelo: e.target.value })} required />
              </Field>
              <Field label="Material">
                <input style={inputStyle} list="lista-materiais-sapato" value={pedido.material} onChange={(e) => setPedido({ ...pedido, material: e.target.value })} />
              </Field>
              <Field label="Cor">
                <input style={inputStyle} list="lista-cores-sapato" value={pedido.cor} onChange={(e) => setPedido({ ...pedido, cor: e.target.value })} />
              </Field>
              <Field label="Numeração (nº do pé do cliente)">
                <input style={inputStyle} list="lista-numeracoes-sapato" value={pedido.numeracao} onChange={(e) => setPedido({ ...pedido, numeracao: e.target.value })} required />
              </Field>
              <Field label="Quantidade">
                <input type="number" min="1" style={inputStyle} value={pedido.quantidade} onChange={(e) => setPedido({ ...pedido, quantidade: e.target.value })} />
              </Field>
            </div>

            <Field label="Personalização (nome gravado no sapato)">
              <input style={inputStyle} value={pedido.personalizacao} onChange={(e) => setPedido({ ...pedido, personalizacao: e.target.value })} />
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>Vem preenchido com o nome do cliente — edite se for diferente (presente, apelido, etc.).</span>
            </Field>

            <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <Field label="Status">
                <select style={inputStyle} value={pedido.status} onChange={(e) => setPedido({ ...pedido, status: e.target.value })}>
                  {STATUS_SAPATOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Previsão de entrega">
                <input type="date" style={inputStyle} value={pedido.previsaoEntrega} onChange={(e) => setPedido({ ...pedido, previsaoEntrega: e.target.value })} />
              </Field>
              <Field label="Valor da venda (R$)">
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  placeholder="a definir — comissão em negociação"
                  value={pedido.valorVenda}
                  onChange={(e) => setPedido({ ...pedido, valorVenda: e.target.value })}
                />
                <span style={{ fontSize: 10, color: TEXT_MUTED }}>Opcional por enquanto — dá pra deixar em branco e preencher quando o preço fechar.</span>
              </Field>
            </div>
          </div>

          <Field label="Observações">
            <textarea
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="Ex.: cliente prefere retirar no showroom"
              value={pedido.observacoes}
              onChange={(e) => setPedido({ ...pedido, observacoes: e.target.value })}
            />
          </Field>
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <CampoDadosPessoais value={dadosPessoais} onChange={setDadosPessoais} />
        </Card>

        {erro && (
          <div className="mb-4 px-4 py-3 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          style={{ background: INK, color: "#FFF", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? "Salvando…" : "Salvar Pedido"}
        </button>
      </form>
    </div>
  );
}
