// src/lib/exportacao.ts
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Gera e dispara download de um arquivo CSV a partir de um array de objetos.
 * Inclui BOM UTF-8 para o Excel reconhecer acentuação corretamente.
 */
export function exportarCSV(dados: object[], nomeArquivo: string): void {
  if (!dados.length) return;

  const cabecalhos = Object.keys(dados[0]);

  const escapar = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const linhas = [
    cabecalhos.map(escapar).join(","),
    ...dados.map((row) =>
      cabecalhos
        .map((k) => escapar((row as Record<string, unknown>)[k]))
        .join(",")
    ),
  ];

  const bom = "\uFEFF";
  const blob = new Blob([bom + linhas.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Gera e dispara download de um PDF com tabela usando jsPDF + autotable.
 * O import estático garante que autoTable se registra corretamente no protótipo.
 */
export function exportarPDF(
  colunas: string[],
  linhas: string[][],
  titulo: string,
  nomeArquivo: string
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(titulo, 14, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const agora = new Date();
  doc.text(
    `Gerado em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    14,
    25
  );
  doc.setTextColor(0, 0, 0);

  (doc as any).autoTable({
    head: [colunas],
    body: linhas,
    startY: 30,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: "helvetica",
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [191, 242, 5],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${nomeArquivo}.pdf`);
}