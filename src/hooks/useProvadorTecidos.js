import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const BUCKET = "provador-tecidos";

function slug(nome) {
  return (nome || "tecido")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "tecido";
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*);base64/) || [])[1] || "image/jpeg";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function rowParaFabric(row) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(row.imagem_path);
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo || "",
    peca: row.peca,
    tipo: row.tipo || null,
    cm: parseFloat(row.cm) || 10,
    rot: !!row.rot,
    url: data?.publicUrl || "",
    imagemPath: row.imagem_path,
  };
}

// Mostruário do Provador de Tecidos (a ferramenta de prévia de tecido
// na peça, integrada de Ana) — antes salvo só no navegador de quem
// tirava a foto (localStorage), agora compartilhado entre todo mundo:
// a foto vai pro Storage (bucket "provador-tecidos"), só a referência
// fica no banco, pra não deixar o sistema pesado com imagem em base64
// numa coluna de texto.
export function useProvadorTecidos() {
  const [tecidos, setTecidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("provador_tecidos").select("*").order("criado_em", { ascending: false });
    if (!error) setTecidos((data || []).map(rowParaFabric));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionar({ nome, codigo, cm, rot, peca, tipo, imageDataUrl }) {
    const blob = dataUrlToBlob(imageDataUrl);
    const path = `${peca}/${Date.now()}-${slug(nome)}.jpg`;
    const { error: errUp } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (errUp) throw errUp;
    const { data: row, error: errIns } = await supabase
      .from("provador_tecidos")
      .insert({ nome, codigo: codigo || null, peca, tipo: tipo || null, cm: Number(cm) || 10, rot: !!rot, imagem_path: path })
      .select("*")
      .single();
    if (errIns) throw errIns;
    const fabric = rowParaFabric(row);
    setTecidos((prev) => [fabric, ...prev]);
    return fabric;
  }

  async function atualizar(id, patch) {
    const campos = {};
    if (patch.nome !== undefined) campos.nome = patch.nome;
    if (patch.codigo !== undefined) campos.codigo = patch.codigo || null;
    if (patch.peca !== undefined) campos.peca = patch.peca;
    const { error } = await supabase.from("provador_tecidos").update(campos).eq("id", id);
    if (error) throw error;
    setTecidos((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  async function remover(id) {
    const fb = tecidos.find((f) => f.id === id);
    const { error } = await supabase.from("provador_tecidos").delete().eq("id", id);
    if (error) throw error;
    if (fb?.imagemPath) {
      try {
        await supabase.storage.from(BUCKET).remove([fb.imagemPath]);
      } catch {
        // linha já removida do banco — a sobra no Storage não bloqueia o fluxo
      }
    }
    setTecidos((prev) => prev.filter((f) => f.id !== id));
  }

  return { tecidos, loading, recarregar, adicionar, atualizar, remover };
}
