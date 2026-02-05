const BASE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana";

export interface GenerateOptions {
  prompt: string;
  type?: "TEXTTOIMAGE" | "IMAGETOIMAGE";
  numImages?: number;
  imageUrls?: string[];
  callBackUrl?: string;
}

export interface GenerateResponse {
  code: number;
  msg: string;
  data?: { taskId: string };
}

export interface TaskStatusResponse {
  successFlag: number; // 0 generating, 1 success, 2 create failed, 3 generate failed
  response?: { resultImageUrl?: string };
  errorMessage?: string;
}

export async function createGenerateTask(
  apiKey: string,
  options: GenerateOptions
): Promise<string> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: options.prompt,
      type: options.type ?? "TEXTTOIMAGE",
      numImages: options.numImages ?? 1,
      imageUrls: options.imageUrls,
      callBackUrl: options.callBackUrl,
    }),
  });
  const json: GenerateResponse = await res.json();
  if (!res.ok || json.code !== 200 || !json.data?.taskId) {
    throw new Error(json.msg ?? "Failed to create generation task");
  }
  return json.data.taskId;
}

export async function getTaskStatus(
  apiKey: string,
  taskId: string
): Promise<TaskStatusResponse> {
  const res = await fetch(
    `${BASE_URL}/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  const json = await res.json();
  return json as TaskStatusResponse;
}
