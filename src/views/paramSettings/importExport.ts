import { ElMessage } from "element-plus";
import * as XLSX from "xlsx";

export function isExcelFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "xlsx" || ext === "xls";
}

export async function readExcelJsonRows(
  file: File
): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true
  });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    raw: false,
    defval: ""
  });
}

export function showImportResult(
  added: number,
  skipped: number,
  failed: number
): void {
  if (added > 0) {
    const parts = [`导入成功 ${added} 条`];
    if (skipped > 0) parts.push(`跳过 ${skipped} 条`);
    if (failed > 0) parts.push(`失败 ${failed} 条`);
    ElMessage.success(parts.join("，"));
  } else {
    ElMessage.warning(
      skipped || failed
        ? `未导入成功（跳过 ${skipped} 条，失败 ${failed} 条）`
        : "未导入任何数据，请检查文件格式与内容"
    );
  }
}

export function requireSelectionForExport<T>(selection: T[]): T[] | null {
  if (!selection.length) {
    ElMessage.warning("请至少选择一条数据进行导出");
    return null;
  }
  return selection;
}

export function logImportFailures(
  label: string,
  failures: { row: number; reason: string }[]
): void {
  if (!failures.length) return;
  console.group(`[${label}] 导入跳过/失败明细`);
  failures.forEach(f => console.warn(`第 ${f.row} 行: ${f.reason}`));
  console.groupEnd();
}
