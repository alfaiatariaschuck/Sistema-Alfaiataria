import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Receipt } from "lucide-react";
import { Card, Field, PageTitle } from "../components/ui";
import { BRASS, INK, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_FABI = "telefone_fabi";
const CHAVE_ICARO = "telefone_icaro";
const CHAVE_SUMIDO = "cliente_sumido_meses";
const CHAVE_META_CAMISARIA = "meta_vendas_camisaria";
const CHAVE_META_ALFAIATARIA = "meta_vendas_alfaiataria";
const CHAVE_ALUGUEL = "custo_aluguel_mensal"; // Aluguel do ateliê (produção)
const CHAVE_LUZ = "custo_luz_mensal"; // Luz do ateliê (produção)
const CHAVE_ALUGUEL_LOJA = "custo_aluguel_loja_mensal";
const CHAVE_LUZ_LOJA = "custo_luz_loja_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
const CHAVE_CUSTOS_FIXOS_PJ = "custos_fixos_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";

export default function Configuracoes({ despesas = [], onCriarDespesa }) {
  const [telFabi, setTelFabi] = useState("");
  const [telIcaro, setTelIcaro] = useState("");
  const [sumidoMeses, setSumidoMeses] = useState("6");
  const [metaCamisaria, setMetaCamisaria] = useState("");
  const [metaAlfaiataria, setMetaAlfaiataria] = useState("");
  const [aluguel, setAluguel] = useState("");
  const [luz, setLuz] = useState("");
  const [aluguelLoja, setAluguelLoja] = useState("");
  const [luzLoja, setLuzLoja] = useState("");
  const [prolabore, setProlabore] = useState("");
  const [custosFixosPJ, setCustosFixosPJ] = useState("");
  const [planoSaudePJ, setPlanoSaudePJ] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvo, setSalvo] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [
          CHAVE_FABI,
          CHAVE_ICARO,
          CHAVE_SUMIDO,
          CHAVE_META_CAMISARIA,
          CHAVE_META_ALFAIATARIA,
          CHAVE_ALUGUEL,
          CHAVE_LUZ,
          CHAVE_ALUGUEL_LOJA,
          CHAVE_LUZ_LOJA,
          CHAVE_PROLABORE,
          CHAVE_CUSTOS_FIXOS_PJ,
          CHAVE_PLANO_SAUDE_PJ,
        ]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_FABI) setTelFabi(row.valor || "");
        if (row.chave === CHAVE_ICARO) setTelIcaro(row.valor || "");
        if (row.chave === CHAVE_SUMIDO) setSumidoMeses(row.valor || "6");
        if (row.chave === CHAVE_META_CAMISARIA) setMetaCamisaria(row.valor || "");
        if (row.chave === CHAVE_META_ALFAIATARIA) setMetaAlfaiataria(row.valor || "");
        if (row.chave === CHAVE_ALUGUEL) setAluguel(row.valor || "");
        if (row.chave === CHAVE_LUZ) setLuz(row.valor || "");
        if (row.chave === CHAVE_ALUGUEL_LOJA) setAluguelLoja(row.valor || "");
        if (row.chave === CHAVE_LUZ_LOJA) setLuzLoja(row.valor || "");
        if (row.chave === CHAVE_PROLABORE) setProlabore(row.valor || "");
        if (row.chave === CHAVE_CUSTOS_FIXOS_PJ) setCustosFixosPJ(row.valor || "");
        if (row.chave === CHAVE_PLANO_SAUDE_PJ) setPlanoSaudePJ(row.valor || "");
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
      { chave: CHAVE_ALUGUEL, valor: aluguel },
      { chave: CHAVE_LUZ, valor: luz },
      { chave: CHAVE_ALUGUEL_LOJA, valor: aluguelLoja },
      { chave: CHAVE_LUZ_LOJA, valor: luzLoja },
      { chave: CHAVE_PROLABORE, valor: prolabore },
      { chave: CHAVE_CUSTOS_FIXOS_PJ, valor: custosFixosPJ },
      { chave: CHAVE_PLANO_SAUDE_PJ, valor: planoSaudePJ },
    ]);
    setSalvo(!error);
  }

  const [gerando, setGerando] = useState(false);
  const [resultadoGeracao, setResultadoGeracao] = useState(null);

  // Lança em Contas a Pagar uma despesa recorrente pra cada custo fixo
  // preenchido acima — só na primeira vez, já que "recorrente" cuida
  // sozinho de lançar a ocorrência do mês seguinte quando marcada como
  // paga. Se já existe uma despesa com essa descrição nesse mês, pula
  // (evita duplicar se clicar de novo).
  async function gerarContasAPagar() {
    setGerando(true);
    setResultadoGeracao(null);
    const mesAtual = hojeISO().slice(0, 7);
    const vencimentoPadrao = `${mesAtual}-05`;
    const itens = [
      { descricao: "Pró-labore", categoria: "Pró-labore", valor: prolabore },
      { descricao: "Aluguel — Ateliê", categoria: "Aluguel", valor: aluguel },
      { descricao: "Luz — Ateliê", categoria: "Água/Luz/Internet", valor: luz },
      { descricao: "Aluguel — Loja", categoria: "Aluguel", valor: aluguelLoja },
      { descricao: "Luz — Loja", categoria: "Água/Luz/Internet", valor: luzLoja },
      { descricao: "Plano de saúde empresarial", categoria: "Plano de Saúde", valor: planoSaudePJ },
      { descricao: "Outros custos fixos PJ", categoria: "Outros", valor: custosFixosPJ },
    ].filter((it) => (parseFloat(it.valor) || 0) > 0);

    let criadas = 0;
    let jaExistiam = 0;
    let totalCriado = 0;
    for (const item of itens) {
      const existe = despesas.some((d) => d.descricao === item.descricao && d.vencimento && d.vencimento.slice(0, 7) === mesAtual);
      if (existe) {
        jaExistiam++;
        continue;
      }
      await onCriarDespesa({
        descricao: item.descricao,
        categoria: item.categoria,
        fornecedor: "",
        valor: item.valor,
        vencimento: vencimentoPadrao,
        recorrente: true,
      });
      criadas++;
      totalCriado += parseFloat(item.valor) || 0;
    }
    setResultadoGeracao(
      criadas > 0
        ? `Lançadas ${criadas} conta(s) nova(s), totalizando ${brl(totalCriado)}${jaExistiam > 0 ? ` (${jaExistiam} já existiam esse mês, puladas)` : ""}.`
        : `Nada novo pra lançar — ${jaExistiam > 0 ? "todas já existem esse mês" : "preencha algum custo fixo acima primeiro"}.`
    );
    setGerando(false);
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
            <Field label="Aluguel do Ateliê — produção (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={aluguel} onChange={(e) => setAluguel(e.target.value)} />
            </Field>
            <Field label="Luz do Ateliê — produção (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={luz} onChange={(e) => setLuz(e.target.value)} />
            </Field>
            <Field label="Aluguel da Loja — camisaria (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={aluguelLoja} onChange={(e) => setAluguelLoja(e.target.value)} />
            </Field>
            <Field label="Luz da Loja — camisaria (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={luzLoja} onChange={(e) => setLuzLoja(e.target.value)} />
            </Field>
            <Field label="Seu pró-labore/retirada pessoal (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={prolabore} onChange={(e) => setProlabore(e.target.value)} />
            </Field>
            <Field label="Plano de saúde empresarial (R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={planoSaudePJ} onChange={(e) => setPlanoSaudePJ(e.target.value)} />
            </Field>
            <Field label="Outros custos fixos PJ (contador, impostos, sistemas, marketing, combustível, internet, outros — R$/mês)">
              <input type="number" step="0.01" style={inputStyle} value={custosFixosPJ} onChange={(e) => setCustosFixosPJ(e.target.value)} />
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

      {onCriarDespesa && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
            Contas a Pagar — lançar os custos fixos deste mês
          </div>
          <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>
            Cria (ou atualiza, se já existir) uma despesa recorrente em Contas a Pagar pra cada custo fixo preenchido
            acima — pró-labore, aluguel/luz do ateliê e da loja, plano de saúde e outros custos PJ. Recorrente já
            lança a próxima ocorrência automaticamente quando você marca como paga, então normalmente só precisa
            clicar isso uma vez.
          </p>
          <button
            onClick={gerarContasAPagar}
            disabled={gerando}
            className="flex items-center gap-1.5"
            style={{ background: BRASS, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: gerando ? 0.6 : 1 }}
          >
            <Receipt size={15} /> {gerando ? "Lançando…" : "Lançar custos fixos deste mês"}
          </button>
          {resultadoGeracao && (
            <div className="mt-3 px-4 py-2 rounded" style={{ background: "#DCEBDD", color: "#2C6E31", fontSize: 13 }}>
              {resultadoGeracao}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
