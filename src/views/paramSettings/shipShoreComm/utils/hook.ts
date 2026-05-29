import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { Ref } from "vue";
import type { HistoryItem, CommandStatus } from "./types";
import { postMqttPublishWithResponse } from "@/api/paramSettings/shipShoreComm";

const DETECT_PATH = "/home/csnt/project/service/application/data/log";
const SYNC_PATH = "/home/csnt/project/service/sync/logs";
const CMD_PREFIX = "执行命令：";

const COMMON_COMMANDS = [
  "ls -la",
  "ps aux",
  "df -h",
  "netstat -tulpn",
  "top",
  "free -h"
];

const STATUS_TEXT: Record<CommandStatus, string> = {
  success: "成功",
  error: "失败",
  timeout: "超时",
  executing: "执行中"
};

export function useShipShoreComm(selectedBoatId: Ref<string>) {
  // ── 状态 ──────────────────────────────────────────────────────────────────
  const userInput = ref("");
  const commandInput = ref("");
  const outputLines = ref<string[]>([]);
  const isExecuting = ref(false);
  const historyIndex = ref(-1);
  const originalInput = ref("");
  const outputRef = ref<HTMLElement | null>(null);
  const commandInputRef = ref<{ focus: () => void } | null>(null);
  const commandHistory = ref<HistoryItem[]>([]);
  const showSuggestions = ref(false);
  const selectedSuggestionIndex = ref(0);

  // 设置
  const waitTime = ref(30);
  const serviceType = ref<"aiservice" | "sync_service">("aiservice");
  const showSettingsDialog = ref(false);

  // ── 历史持久化 ────────────────────────────────────────────────────────────
  const getStorageKey = () => {
    const user = localStorage.getItem("username") ?? "unknown";
    const devid =
      selectedBoatId.value || localStorage.getItem("devid") || "unknown";
    return `ShipShoreCommandHistory_${user}_${devid}`;
  };

  function loadHistory() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) commandHistory.value = p;
      }
    } catch {
      // ignore localStorage read errors
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(
        getStorageKey(),
        JSON.stringify(commandHistory.value.slice(0, 100))
      );
    } catch {
      // ignore localStorage write errors
    }
  }

  watch(commandHistory, saveHistory, { deep: true });
  watch(selectedBoatId, () => loadHistory());

  // ── 工具函数 ──────────────────────────────────────────────────────────────
  function formatDateTime(d = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours()
    )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function normalizeNewlines(s: string): string {
    return s
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\/n/g, "\n");
  }

  function getStatusText(s: CommandStatus): string {
    return STATUS_TEXT[s] ?? "未知";
  }

  function getLineClass(line: string): string {
    if (line.startsWith(CMD_PREFIX)) return "cmd-line--command";
    if (/error|Error|ERROR/.test(line)) return "cmd-line--error";
    if (/warning|Warning|WARNING/.test(line)) return "cmd-line--warning";
    if (/success|Success|SUCCESS/.test(line)) return "cmd-line--success";
    return "cmd-line--output";
  }

  // ── 建议命令 ──────────────────────────────────────────────────────────────
  const filteredSuggestions = computed(() => {
    if (!commandInput.value.trim()) return COMMON_COMMANDS.slice(0, 5);
    return COMMON_COMMANDS.filter(c =>
      c.toLowerCase().includes(commandInput.value.toLowerCase())
    ).slice(0, 8);
  });

  // ── 输入逻辑 ──────────────────────────────────────────────────────────────
  function updateCommandInput() {
    commandInput.value = userInput.value.trim();
  }

  function handleUserInput() {
    updateCommandInput();
    showSuggestions.value = !!userInput.value.trim();
    selectedSuggestionIndex.value = 0;
  }

  function handleBlur() {
    setTimeout(() => {
      showSuggestions.value = false;
    }, 200);
  }

  function selectSuggestion(s: string) {
    userInput.value = s;
    updateCommandInput();
    showSuggestions.value = false;
    nextTick(() => commandInputRef.value?.focus());
  }

  function handleTabCompletion() {
    if (filteredSuggestions.value.length > 0) {
      selectSuggestion(
        filteredSuggestions.value[selectedSuggestionIndex.value]
      );
    }
  }

  function navigateHistory(dir: "up" | "down") {
    if (dir === "up") {
      if (historyIndex.value < commandHistory.value.length - 1) {
        if (historyIndex.value === -1) originalInput.value = commandInput.value;
        historyIndex.value++;
        fillCommand(commandHistory.value[historyIndex.value].command);
      }
    } else {
      if (historyIndex.value > 0) {
        historyIndex.value--;
        fillCommand(commandHistory.value[historyIndex.value].command);
      } else if (historyIndex.value === 0) {
        historyIndex.value = -1;
        if (originalInput.value) fillCommand(originalInput.value);
        else {
          userInput.value = "";
          updateCommandInput();
        }
      }
    }
  }

  function fillCommand(cmd: string) {
    userInput.value = cmd;
    updateCommandInput();
    nextTick(() => commandInputRef.value?.focus());
  }

  function fillQuickCommand(cmd: string) {
    fillCommand(cmd);
  }

  function switchToDetectPath() {
    const cur = userInput.value.trim();
    if (cur.endsWith(DETECT_PATH)) return;
    userInput.value = cur.endsWith(SYNC_PATH)
      ? cur.slice(0, -SYNC_PATH.length).trim() + " " + DETECT_PATH
      : (cur ? cur + " " : "") + DETECT_PATH;
    updateCommandInput();
    nextTick(() => commandInputRef.value?.focus());
  }

  function switchToSyncPath() {
    const cur = userInput.value.trim();
    if (cur.endsWith(SYNC_PATH)) return;
    userInput.value = cur.endsWith(DETECT_PATH)
      ? cur.slice(0, -DETECT_PATH.length).trim() + " " + SYNC_PATH
      : (cur ? cur + " " : "") + SYNC_PATH;
    updateCommandInput();
    nextTick(() => commandInputRef.value?.focus());
  }

  function clearPrefix() {
    const cur = userInput.value.trim();
    if (!cur) return;
    for (const p of [DETECT_PATH, SYNC_PATH]) {
      if (cur.endsWith(p)) {
        userInput.value = cur.slice(0, -p.length).trim();
        updateCommandInput();
        nextTick(() => commandInputRef.value?.focus());
        return;
      }
    }
    const parts = cur.split(" ");
    if (parts.length > 1 && parts[parts.length - 1].startsWith("/")) {
      parts.pop();
      userInput.value = parts.join(" ").trim();
      updateCommandInput();
      nextTick(() => commandInputRef.value?.focus());
    }
  }

  // ── 剪贴板 / 导出 ─────────────────────────────────────────────────────────
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      ElMessage.success("已复制到剪贴板");
    } catch {
      ElMessage.error("复制失败");
    }
  }

  function exportToFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  }

  function exportOutput() {
    if (!outputLines.value.length) {
      ElMessage.warning("没有可导出的内容");
      return;
    }
    exportToFile(
      outputLines.value.join("\n"),
      `command-output-${Date.now()}.txt`
    );
  }

  function copyOutput() {
    if (!outputLines.value.length) {
      ElMessage.warning("没有可复制的内容");
      return;
    }
    copyToClipboard(outputLines.value.join("\n"));
  }

  function exportHistory() {
    if (!commandHistory.value.length) {
      ElMessage.warning("没有可导出的历史记录");
      return;
    }
    exportToFile(
      commandHistory.value
        .map(i => `${i.time} - ${i.command} (${getStatusText(i.status)})`)
        .join("\n"),
      `command-history-${Date.now()}.txt`
    );
  }

  function copyHistory() {
    if (!commandHistory.value.length) {
      ElMessage.warning("没有可复制的历史记录");
      return;
    }
    copyToClipboard(
      commandHistory.value
        .map(
          i =>
            `${i.time} - ${i.command} (${getStatusText(i.status)})` +
            (i.resultLines?.length ? `\n${i.resultLines.join("\n")}` : "")
        )
        .join("\n\n")
    );
  }

  // ── 清空 ──────────────────────────────────────────────────────────────────
  function clearOutput() {
    ElMessageBox.confirm("确定要清空所有输出内容吗？", "确认清空", {
      type: "warning"
    })
      .then(() => {
        outputLines.value = [];
        ElMessage.success("输出内容已清空");
      })
      .catch(() => undefined);
  }

  function clearHistory() {
    ElMessageBox.confirm("确定要清空所有历史记录吗？", "确认清空", {
      type: "warning"
    })
      .then(() => {
        try {
          localStorage.removeItem(getStorageKey());
        } catch {
          // ignore localStorage remove errors
        }
        commandHistory.value = [];
        ElMessage.success("历史记录已清空");
      })
      .catch(() => undefined);
  }

  // ── 历史结果展开 ──────────────────────────────────────────────────────────
  function toggleResult(index: number) {
    commandHistory.value[index].showResult =
      !commandHistory.value[index].showResult;
  }

  // ── 设置 ──────────────────────────────────────────────────────────────────
  function confirmSettings() {
    showSettingsDialog.value = false;
    ElMessage.success("设置已保存");
  }

  // ── 发送命令 ──────────────────────────────────────────────────────────────
  function scrollOutputToBottom() {
    nextTick(() => {
      if (outputRef.value)
        outputRef.value.scrollTop = outputRef.value.scrollHeight;
    });
  }

  function extractResult(raw: unknown): string | null {
    if (raw == null) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      if (r.response != null) return String(r.response);
      if (r.data != null) {
        const d = r.data;
        if (typeof d === "object" && d !== null && "response" in d)
          return String((d as Record<string, unknown>).response);
        return typeof d === "string" ? d : JSON.stringify(d, null, 2);
      }
      return JSON.stringify(r, null, 2);
    }
    return null;
  }

  async function sendCommand() {
    updateCommandInput();
    const msg = commandInput.value.trim();
    if (!msg) {
      ElMessage.warning("请输入指令");
      return;
    }
    if (isExecuting.value) {
      ElMessage.warning("命令正在执行中，请等待...");
      return;
    }
    if (!selectedBoatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }

    const devid = selectedBoatId.value;
    const command = msg;
    const time = formatDateTime();
    isExecuting.value = true;
    historyIndex.value = -1;

    const topic = `maritime/side_ship/${devid}/${serviceType.value}/cmd`;
    outputLines.value.push(CMD_PREFIX + command);

    let countdownTimer: ReturnType<typeof setInterval> | null = null;
    let waitLineIndex = -1;

    try {
      let remaining = waitTime.value;
      const waitText = (s: number) => `等待执行结果中... (${s}秒)`;
      outputLines.value.push(waitText(remaining));
      waitLineIndex = outputLines.value.length - 1;

      countdownTimer = setInterval(() => {
        if (remaining > 0) {
          remaining--;
          if (outputLines.value[waitLineIndex]?.includes("等待执行结果中")) {
            outputLines.value[waitLineIndex] = waitText(remaining);
          }
        }
      }, 1000);

      scrollOutputToBottom();

      const response = await postMqttPublishWithResponse({
        publishTopic: topic,
        message: msg,
        deviceId: devid,
        publishQosLevel: "1",
        responseQosLevel: "1",
        timeoutSeconds: waitTime.value
      });

      if (countdownTimer) clearInterval(countdownTimer);
      if (outputLines.value[waitLineIndex]?.includes("等待执行结果中")) {
        outputLines.value.splice(waitLineIndex, 1);
      }

      const checkTimeoutError = (r: unknown) => {
        if (typeof r !== "object" || r === null) return;
        const o = r as Record<string, unknown>;
        const msgStr = String(o.message ?? "");
        if (msgStr.includes("等待响应超时") || msgStr.includes("超时"))
          throw new Error("TIMEOUT_RESPONSE");
        if (o.success === false)
          throw new Error(`SERVER_ERROR: ${msgStr || "服务器错误"}`);
        if (o.statuscode != null && Number(o.statuscode) >= 400)
          throw new Error(`SERVER_ERROR: ${msgStr}`);
        if (o.code != null && o.code !== 0 && o.code !== 200 && msgStr)
          throw new Error(`SERVER_ERROR: ${msgStr}`);
      };

      checkTimeoutError(response);
      checkTimeoutError(response?.data);

      let result = extractResult(response) ?? "命令执行完成，但未返回具体结果";
      result = normalizeNewlines(result);

      outputLines.value.push(result);
      commandHistory.value.unshift({
        command,
        time,
        status: "success",
        result,
        showResult: false,
        resultLines: result.split("\n")
      });
      ElMessage.success("命令执行成功");
    } catch (error: unknown) {
      if (countdownTimer) clearInterval(countdownTimer);
      if (
        waitLineIndex >= 0 &&
        outputLines.value[waitLineIndex]?.includes("等待执行结果中")
      ) {
        outputLines.value.splice(waitLineIndex, 1);
      }

      const err = error as Error;
      let errorMsg = "";
      let errorType: "error" | "timeout" = "error";

      if (
        err.message === "TIMEOUT_RESPONSE" ||
        err.message?.includes("timeout")
      ) {
        errorMsg = `超时错误: 等待 ${waitTime.value} 秒后未收到响应`;
        errorType = "timeout";
      } else if (err.message?.startsWith("SERVER_ERROR:")) {
        errorMsg = `服务器错误: ${err.message.replace("SERVER_ERROR: ", "")}`;
      } else if (err.message?.includes("Network Error")) {
        errorMsg = "网络错误: 无法连接到服务器";
      } else {
        errorMsg = `执行错误: ${err.message || "未知错误"}`;
      }

      errorMsg += `\n错误时间: ${formatDateTime()}`;
      outputLines.value.push(normalizeNewlines(errorMsg));
      commandHistory.value.unshift({
        command,
        time,
        status: errorType,
        result: errorMsg,
        showResult: false,
        resultLines: normalizeNewlines(errorMsg).split("\n")
      });

      if (errorType === "timeout")
        ElMessage.warning("命令执行超时，请增加等待时间");
      else ElMessage.error("命令执行失败");
    }

    if (commandHistory.value.length > 100)
      commandHistory.value = commandHistory.value.slice(0, 100);
    saveHistory();
    userInput.value = "";
    commandInput.value = "";
    isExecuting.value = false;
    scrollOutputToBottom();
  }

  function reExecuteCommand(command: string) {
    fillCommand(command);
    sendCommand();
  }

  // ── 键盘快捷键 ────────────────────────────────────────────────────────────
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "l") {
      event.preventDefault();
      clearOutput();
    }
    if (event.ctrlKey && event.key === "k") {
      event.preventDefault();
      clearHistory();
    }
  }

  // ── 生命周期 ──────────────────────────────────────────────────────────────
  let currentKey = getStorageKey();

  onMounted(() => {
    loadHistory();
    const handleStorage = () => {
      const nk = getStorageKey();
      if (nk !== currentKey) {
        currentKey = nk;
        loadHistory();
      }
    };
    window.addEventListener("storage", handleStorage);
    const timer = setInterval(() => {
      const nk = getStorageKey();
      if (nk !== currentKey) {
        currentKey = nk;
        loadHistory();
      }
    }, 2000);
    document.addEventListener("keydown", handleKeydown);

    onUnmounted(() => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(timer);
      document.removeEventListener("keydown", handleKeydown);
    });
  });

  return {
    // state
    userInput,
    commandInput,
    outputLines,
    isExecuting,
    commandHistory,
    showSuggestions,
    selectedSuggestionIndex,
    outputRef,
    commandInputRef,
    waitTime,
    serviceType,
    showSettingsDialog,
    // computed
    filteredSuggestions,
    // methods - input
    handleUserInput,
    handleBlur,
    selectSuggestion,
    handleTabCompletion,
    navigateHistory,
    fillCommand,
    fillQuickCommand,
    updateCommandInput,
    clearPrefix,
    switchToDetectPath,
    switchToSyncPath,
    // methods - output
    getLineClass,
    getStatusText,
    // methods - actions
    sendCommand,
    reExecuteCommand,
    toggleResult,
    clearOutput,
    clearHistory,
    confirmSettings,
    copyToClipboard,
    exportOutput,
    copyOutput,
    exportHistory,
    copyHistory,
    CMD_PREFIX
  };
}
