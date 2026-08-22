import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Field, PageTitle } from "../components/ui";
import { INK, TEXT_MUTED, inputStyle } from "../lib/constants";
import { supabase } from "../supabaseClient";

const CHAVE_FABI = "telefone_fabi";
const CHAVE_ICARO = "telefone_icaro";
const CHAVE_SUMIDO = "cliente_sumido_meses";
const CHAVE_META_CAMISARIA = "meta_vendas_camisaria";
const CHAVE_META_ALFAIATARIA = "meta_vendas_alfaiataria";

export default function Configuracoes() {
  const [telFabi, setTelFabi] = useState("");
  const [telIcaro, setTelIcaro] = useState("");
  const [sumidoMeses, setSumidoMeses] = useState("6");
  const [metaCamisaria, setMetaCamisaria] = useState("");
  const [metaAlfaiataria, setMetaAlfaiataria] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvo, setSalvo] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_FABI, CHAVE_ICARO, CHAVE_SUMIDO, CHAVE_META_CAMISARIA, CHAVE_META_ALFAIATARIA]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_FABI) setTelFabi(row.valor || "");
        if (row.chave === CHAVE_ICARO) setTelIcaro(row.valor || "");
        if (row.chave === CHAVE_SUMIDO) setSumidoMeses(row.valor || "6");
        if (row.chave === CHAVE_META_CAMISARIA) setMetaCamisaria(row.valor || "");
        if (row.chave === CHAVE_META_ALFAIATARIA) setMetaAlfaiataria(row.valor || "");
      });
      setCarregando(false);
    })();
  }, []);

  async function salvar() {
    setSalvo(null);
    const { error } = await supabase.from("config").upsert([
      { chave: CHAVE_FABI, valor: telFabi },
      { chave: CHAVE_ICARO, valor: telIcaro },
      { chave: CHAVE_SUMIDO, valor: sumidoMeses },
      { chave: CHAVE_META_CAMISARIA, valor: metaCamisaria },
      { chave: CHAVE_META_ALFAIATARIA, valor: metaAlfaiataria },
    ]);
    setSalvo(!error);
  }

  return (
    <div>
      <PageTitle eyebrow="Configuração única" title="Configurações" />
      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
          Contatos de produção
        </div>
        <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>
          Configure aqui uma vez o WhatsApp da Fabi e do Icaro — as fichas de produção (Pedido Camisas e
          Pedido Alfaiataria) já usam esses números automaticamente, sem precisar digitar de novo toda vez.
        </p>
        {carregando ? (
          <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Carregando…</div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Field label="WhatsApp da Fabi (camisas)">
              <input style={inputStyle} placeholder="Ex: 51999998888" value={telFabi} onChange={(e) => setTelFabi(e.target.value)} />
            </Field>
            <Field label="WhatsApp do Icaro (alfaiataria)">
              <input style={inputStyle} placeholder="Ex: 51999997777" value={telIcaro} onChange={(e) => setTelIcaro(e.target.value)} />
            </Field>
          </div>
        )}
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
          Gestão
        </div>
        <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>
          Quantos meses sem comprar pra um cliente aparecer marcado como "sumido" na aba Clientes, e a meta de vendas
          do mês de cada linha (aparece como barra de progresso nos painéis). Deixe a meta em branco pra não mostrar.
        </p>
        {carregando ? (
          <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Carregando…</div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Field label="Cliente sumido após (meses sem comprar)">
              <input type="number" step="1" style={inputStyle} value={sumidoMeses} onChange={(e) => setSumidoMeses(e.target.value)} />
            </Field>
            <Field label="Meta de vendas do mês — Camisaria (R$)">
              <input type="number" step="0.01" style={inputStyle} value={metaCamisaria} onChange={(e) => setMetaCamisaria(e.target.value)} />
            </Field>
            <Field label="Meta de vendas do mês — Alfaiataria (R$)">
              <input type="number" step="0.01" style={inputStyle} value={metaAlfaiataria} onChange={(e) => setMetaAlfaiataria(e.target.value)} />
            </Field>
          </div>
        )}
        <button onClick={salvar} className="mt-2" style={{ background: INK, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
          Salvar
        </button>
        {salvo === true && (
          <div className="mt-3 px-4 py-2 rounded flex items-center gap-2" style={{ background: "#DCEBDD", color: "#2C6E31", fontSize: 13 }}>
            <CheckCircle2 size={15} /> Salvo — já vale pra próxima ficha que você gerar.
          </div>
        )}
        {salvo === false && (
          <div className="mt-3 px-4 py-2 rounded flex items-center gap-2" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
            <AlertCircle size={15} /> Não consegui salvar agora — tenta de novo em instantes.
          </div>
        )}
      </Card>
    </div>
  );
}
