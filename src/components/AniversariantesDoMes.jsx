import React, { useEffect, useState } from "react";
import { Cake, MessageCircle } from "lucide-react";
import { Card, Empty, Pill } from "./ui";
import { BRASS, BRASS_SOFT, LINE, TEXT_MUTED } from "../lib/constants";
import { supabase } from "../supabaseClient";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Aniversariantes do mês corrente — puxa direto de clientes_dados_pessoais
// (só o dono acessa essa tabela, então esse card só aparece no painel dele).
// O link de WhatsApp é o mesmo esquema de sempre: abre com a mensagem
// pronta, você que clica em enviar — sem custo, sem envio automático.
export default function AniversariantesDoMes() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clientes_dados_pessoais")
        .select("cliente_id, data_nascimento, telefone, clientes(nome)")
        .not("data_nascimento", "is", null);

      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const diaAtual = hoje.getDate();

      const doMes = (data || [])
        .map((row) => {
          const [, mes, dia] = row.data_nascimento.split("-").map((n) => parseInt(n, 10));
          return { nome: row.clientes?.nome || "—", telefone: row.telefone, mes: mes - 1, dia };
        })
        .filter((c) => c.mes === mesAtual)
        .sort((a, b) => a.dia - b.dia);

      setLista(doMes.map((c) => ({ ...c, hoje: c.dia === diaAtual })));
      setCarregando(false);
    })();
  }, []);

  if (carregando || lista.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Cake size={16} color={BRASS} />
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
          Aniversariantes de {MESES[new Date().getMonth()]}
        </div>
      </div>
      {lista.length === 0 && <Empty texto="Nenhum aniversariante esse mês." />}
      {lista.map((c, i) => {
        const digitos = (c.telefone || "").replace(/\D/g, "");
        const mensagem = `Oi ${c.nome}! Passando pra desejar um feliz aniversário 🎉🎂 Um grande abraço da equipe Schuck!`;
        return (
          <div key={c.nome + i} className="flex items-center justify-between py-2" style={{ borderBottom: i < lista.length - 1 ? `1px solid ${LINE}` : "none" }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
              <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                {String(c.dia).padStart(2, "0")}/{String(c.mes + 1).padStart(2, "0")}
              </span>
              {c.hoje && <Pill text="hoje! 🎉" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
            </div>
            {digitos && (
              <a
                href={`https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1"
                style={{ background: "#25D366", color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                <MessageCircle size={12} /> Parabenizar
              </a>
            )}
          </div>
        );
      })}
    </Card>
  );
}
