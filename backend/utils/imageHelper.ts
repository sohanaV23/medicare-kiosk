// Helper to convert any image URL (data: base64 OR http/https URL) to a base64 encoded payload
export async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    if (!url) return { data: "", mimeType: "image/jpeg" };
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const meta = parts[0];
      const data = parts[1] || "";
      const mimeMatch = meta.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      return { data, mimeType };
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return {
      data: buffer.toString("base64"),
      mimeType: contentType
    };
  } catch (err) {
    console.error("Error converting image URL to base64 within helper:", err);
    return { data: "", mimeType: "image/jpeg" };
  }
}
