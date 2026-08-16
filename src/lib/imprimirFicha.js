// Imprime a página atual usando um título específico — a maioria dos
// navegadores sugere o título do documento como nome do arquivo ao
// salvar em PDF. Restaura o título original assim que a impressão
// termina (ou fecha, no caso de cancelar).
export function imprimirComNome(nomeArquivo) {
  const tituloOriginal = document.title;
  const nomeSanitizado = (nomeArquivo || "ficha")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  document.title = nomeSanitizado || tituloOriginal;

  function restaurar() {
    document.title = tituloOriginal;
    window.removeEventListener("afterprint", restaurar);
  }
  window.addEventListener("afterprint", restaurar);
  // Fallback para navegadores/fluxos (ex: alguns casos no iOS) que não
  // disparam "afterprint" de forma confiável.
  setTimeout(restaurar, 10000);

  window.print();
}
