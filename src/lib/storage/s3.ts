import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getConfig() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKey = process.env.S3_ACCESS_KEY?.trim();
  const secretKey = process.env.S3_SECRET_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return null;
  }
  return {
    endpoint,
    accessKey,
    secretKey,
    bucket,
    region: process.env.S3_REGION?.trim() || "us-east-1",
    publicUrl: process.env.S3_PUBLIC_URL?.trim().replace(/\/$/, ""),
  };
}

export function isS3Configured(): boolean {
  return getConfig() !== null;
}

function getClient(): S3Client {
  if (client) return client;
  const cfg = getConfig();
  if (!cfg) throw new Error("S3 chưa cấu hình (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)");
  client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
  });
  return client;
}

export function publicUrlForKey(key: string): string {
  const cfg = getConfig();
  if (!cfg) throw new Error("S3 chưa cấu hình");
  if (cfg.publicUrl) return `${cfg.publicUrl}/${key}`;
  const base = cfg.endpoint.replace(/\/$/, "");
  return `${base}/${cfg.bucket}/${key}`;
}

export function extractKeyFromUrl(fileUrl: string): string | null {
  const cfg = getConfig();
  if (!cfg || !fileUrl) return null;
  const trimmed = fileUrl.trim();
  if (cfg.publicUrl && trimmed.startsWith(`${cfg.publicUrl}/`)) {
    return trimmed.slice(cfg.publicUrl.length + 1);
  }
  const pathPrefix = `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}/`;
  if (trimmed.startsWith(pathPrefix)) {
    return trimmed.slice(pathPrefix.length);
  }
  const rel = trimmed.match(/^\/uploads\/projects\/(.+)$/);
  if (rel) return null;
  return null;
}

export async function uploadToS3(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const cfg = getConfig();
  if (!cfg) throw new Error("S3 chưa cấu hình");
  await getClient().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ACL: "public-read",
    })
  );
  return publicUrlForKey(input.key);
}

export async function deleteFromS3(fileUrl: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;
  const key = extractKeyFromUrl(fileUrl);
  if (!key) return;
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    })
  );
}

export function projectFileKey(
  companyId: number,
  projectId: number | null,
  fileName: string
): string {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  const scope = projectId ? `projects/${projectId}` : "drafts";
  return `tenants/${companyId}/${scope}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
}
