import { toast } from "sonner";

export async function copyText(text: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy — please select the text and copy it manually.");
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
