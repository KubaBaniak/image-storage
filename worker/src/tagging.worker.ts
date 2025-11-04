import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Job, Worker } from "bullmq";
import { ImageToTextModel } from "./tagging-model";

const BUCKET_NAME = "images";
const TABLE_NAME = "images";

const redis = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || "",
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const model = new ImageToTextModel();

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 60 * 5, {
      transform: {
        width: 1024,
        height: 1024,
        resize: "contain",
        quality: 85,
      },
    });
  if (error || !data?.signedUrl) throw new Error("signed url error");
  return data.signedUrl;
}

async function alreadyCaptioned(imageId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("images")
    .select("description")
    .eq("id", imageId)
    .single();
  if (error) throw error;
  return Boolean(data?.description);
}

async function processJob(job: Job) {
  const { imageId } = job.data as { imageId: string };

  if (await alreadyCaptioned(imageId)) return;

  const { data: row, error: selErr } = await supabase
    .from(TABLE_NAME)
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (selErr || !row?.storage_path) throw new Error("image not found");
  const url = await getSignedUrl(row.storage_path);

  const imageCaption = await model.inferTagsFromImage(url);

  const { error: updErr } = await supabase
    .from(TABLE_NAME)
    .update({ description: imageCaption, updated_at: new Date().toISOString() })
    .eq("id", imageId);
  if (updErr) throw updErr;
}

const worker = new Worker("image-tagging", processJob, {
  connection: redis,
  prefix: "imgsvc",
});

worker.on("ready", () => console.log("[worker] ready"));
worker.on("active", (job) =>
  console.log("[worker] active", job.id, job.name, job.data),
);
worker.on("completed", (job) => console.log("[worker] completed", job.id));
worker.on("failed", (job, err) =>
  console.error("[worker] failed", job?.id, err),
);
worker.on("error", (err) => console.error("[worker] error", err));
