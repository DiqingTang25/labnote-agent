/**
 * Supabase Storage 服务端操作
 *
 * 使用 service_role key 上传/删除实验文件，
 * 路径格式: {userId}/{expId}/{timestamp}-{filename}
 *
 * 仅在服务端运行（.server.ts），API key 不暴露给浏览器
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceSupabase } from "./supabase-server.server";

const BUCKET = "experiment-files";

/** 上传一个实验文件到 Supabase Storage */
export const uploadFile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      expId: z.string().min(1),
      fileName: z.string().min(1),
      fileBase64: z.string().min(1),
      mimeType: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();
    const timestamp = Date.now();
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._\-一-鿿]/g, "_");
    const path = `${data.userId}/${data.expId}/${timestamp}-${safeName}`;

    const binary = Buffer.from(data.fileBase64, "base64");

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, binary, {
        contentType: data.mimeType,
        upsert: false,
      });

    if (error) {
      console.error("[Storage] Upload failed:", error);
      throw new Error(`文件上传失败: ${error.message}`);
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return { url: urlData.publicUrl, path };
  });

/** 删除 Storage 中的文件 */
export const deleteFile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      path: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([data.path]);

    if (error) {
      console.error("[Storage] Delete failed:", error);
      return false;
    }
    return true;
  });

/** 批量删除实验的所有文件 */
export const deleteExperimentFiles = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      expId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();
    const prefix = `${data.userId}/${data.expId}/`;

    // 列出该实验下所有文件
    const { data: files, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(prefix);

    if (listErr || !files || files.length === 0) return true;

    const paths = files.map((f: { name: string }) => `${prefix}${f.name}`);

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (error) {
      console.error("[Storage] Batch delete failed:", error);
      return false;
    }
    return true;
  });
