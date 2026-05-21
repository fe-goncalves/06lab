// src/lib/exportacao.ts

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
        cabecalhos.map((k) => escapar((row as Record<string, unknown>)[k])).join(",")
      ),
    ];
  
    const bom = "\uFEFF";
    const blob = new Blob([bom + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeArquivo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  export async function exportarPDF(
    colunas: string[],
    linhas: string[][],
    titulo: string,
    nomeArquivo: string
  ): Promise<void> {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
  
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
  
    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica", textColor: [30, 30, 30] },
      headStyles: { fillColor: [20, 20, 20], textColor: [191, 242, 5], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
    });
  
    doc.save(`${nomeArquivo}.pdf`);
  }