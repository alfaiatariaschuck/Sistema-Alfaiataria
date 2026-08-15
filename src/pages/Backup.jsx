import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, ShieldCheck, Upload } from "lucide-react";
import { Card, PageTitle } from "../components/ui";
import { INK, INK_SOFT, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { hojeISO } from "../lib/helpers";

export default function Backup({ pedidos, onImportar }) {
  const [status, setStatus] = useState(null);
  const [mostrarJson, setMostrarJson] = useState(false);
  const [importando, setImportando] = useState(false);
  const json = useMemo(() => JSON.stringify(pedidos, null, 2), [pedidos]);
  const nomeArquivo = `backup-alfaiataria-${hojeISO()}.json`;

  function baixar() {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ ok: true, msg: "Download iniciado." });
    } catch {
      setStatus({ ok: false, msg: 'O download automático não funcionou aqui — use "Ver JSON" abaixo e copie o texto manualmente.' });
      setMostrarJson(true);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(json);
      setStatus({ ok: true, msg: "Copiado para a área de transferência." });
    } catch {
      setMostrarJson(true);
      setStatus({ ok: false, msg: "Não consegui copiar automaticamente — selecione o texto abaixo manualmente." });
    }
  }

  function importar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        if (!Array.isArray(dados)) throw new Error("formato inválido");
        if (
          !confirm(
            `Isso vai ADICIONAR ${dados.length} pedido(s) do arquivo aos ${pedidos.length} pedidos já salvos no banco (nada é apagado). Confirma?`
          )
        )
          return;
        setImportando(true);
        let ok = 0;
        let falhas = 0;
        for (const p of dados) {
          try {
            await onImportar(p);
            ok++;
          } catch {
            falhas++;
          }
        }
        setStatus({
          ok: falhas === 0,
          msg: falhas === 0 ? `${ok} pedido(s) importado(s) com sucesso.` : `${ok} pedido(s) importado(s), ${falhas} falharam (verifique se tinham cliente preenchido).`,
        });
      } catch {
        setStatus({ ok: false, msg: "Esse arquivo não é um backup válido deste sistema." });
      } finally {
        setImportando(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <PageTitle eyebrow="Segurança dos dados" title="Backup" />

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} color="#A9793E" />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Como seus dados ficam salvos
          </div>
        </div>
        <p style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.6 }}>
          Tudo que você preenche é gravado direto no banco de dados (Supabase) assim que você altera um campo — não existe
          botão de "salvar tudo", e os dados ficam disponíveis em qualquer aparelho onde você fizer login. Ainda assim, é
          uma boa prática baixar um backup de vez em quando. A restauração de um backup <strong>adiciona</strong> os
          pedidos do arquivo aos que já existem — ela nunca apaga dados automaticamente.
        </p>
      </Card>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Baixar backup
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-4">
            {pedidos.length} pedido(s) neste momento
          </div>
          <button
            onClick={baixar}
            className="flex items-center gap-2 mb-2"
            style={{ background: INK, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Download size={15} /> Baixar arquivo (.json)
          </button>
          <button
            onClick={copiar}
            className="flex items-center gap-2"
            style={{ background: "transparent", color: INK, border: `1px solid ${LINE}`, padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            Copiar dados
          </button>
          <button onClick={() => setMostrarJson((v) => !v)} className="block mt-3" style={{ fontSize: 12, color: "#A9793E", fontWeight: 600 }}>
            {mostrarJson ? "Ocultar" : "Ver"} JSON bruto
          </button>
          {mostrarJson && (
            <textarea readOnly value={json} onClick={(e) => e.target.select()} style={{ ...inputStyle, minHeight: 160, fontSize: 11, marginTop: 8 }} className="fx-mono" />
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Restaurar de um backup
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-4">
            Adiciona os pedidos do arquivo aos dados atuais do banco — use com cuidado para não duplicar.
          </div>
          <label
            className="flex items-center gap-2 cursor-pointer"
            style={{
              background: importando ? "#EDEAE0" : "transparent",
              color: INK,
              border: `1px solid ${LINE}`,
              padding: "9px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              width: "fit-content",
            }}
          >
            <Upload size={15} /> {importando ? "Importando…" : "Escolher arquivo .json"}
            <input type="file" accept="application/json" onChange={importar} disabled={importando} style={{ display: "none" }} />
          </label>
        </Card>
      </div>

      {status && (
        <div className="mt-5 px-4 py-3 rounded flex items-center gap-2" style={{ background: status.ok ? "#DCEBDD" : "#F6E3D9", color: status.ok ? "#2C6E31" : "#9C4A1E" }}>
          {status.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {status.msg}
        </div>
      )}
    </div>
  );
}
