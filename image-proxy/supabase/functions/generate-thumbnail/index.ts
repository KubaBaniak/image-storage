// supabase/functions/make-thumb/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // ważne: service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false
  }
});
const BUCKET = "images";
const THUMB_W = 400;
const THUMB_H = 300;
/** originals/users/123/photo.jpg -> thumbnails/users/123/photo.jpg */ function toThumbPath(originalPath) {
  if (!originalPath.startsWith("originals/")) return null;
  return originalPath.replace(/^originals\//, "thumbnails/");
}
/** centralny crop do w×h po wcześniejszym “cover” scale */ function coverAndCrop(img, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const newW = Math.ceil(img.width * scale);
  const newH = Math.ceil(img.height * scale);
  const resized = img.resize(newW, newH); // zachowuje proporcje
  const x = Math.max(0, Math.floor((newW - w) / 2));
  const y = Math.max(0, Math.floor((newH - h) / 2));
  return resized.crop(x, y, w, h);
}
Deno.serve(async (req)=>{
  try {
    const payload = await req.json().catch(()=>null);
    const record = payload?.record ?? {};
    // Supabase Storage webhook zwykle daje bucket_id + name
    const bucket = record.bucket ?? record.bucket_id ?? null;
    const name = record.name ?? null;
    if (!bucket || !name) {
      return new Response(JSON.stringify({
        error: "invalid payload"
      }), {
        status: 400
      });
    }
    if (bucket !== BUCKET) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "bucket mismatch"
      }), {
        status: 200
      });
    }
    if (!name.startsWith("originals/")) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "not an original"
      }), {
        status: 200
      });
    }
    const thumbPath = toThumbPath(name);
    if (!thumbPath) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "bad path"
      }), {
        status: 200
      });
    }
    // 1) Pobierz oryginał
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(name);
    if (dlErr) {
      return new Response(JSON.stringify({
        error: "download failed",
        details: dlErr.message
      }), {
        status: 500
      });
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    let img;
    try {
      img = await Image.decode(buf);
    } catch  {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "not an image"
      }), {
        status: 200
      });
    }
    // 2) Zrób miniaturę 400×300 (cover + centralny crop), JPG q80
    const thumb = coverAndCrop(img, THUMB_W, THUMB_H);
    const jpeg = await thumb.encodeJPEG(80);
    // 3) Zapisz miniaturę (idempotentnie)
    const { error: upErr } = await supabase.storage.from(bucket).upload(thumbPath, new Blob([
      jpeg
    ], {
      type: "image/jpeg"
    }), {
      contentType: "image/jpeg",
      upsert: true
    });
    if (upErr) {
      return new Response(JSON.stringify({
        error: "upload failed",
        details: upErr.message
      }), {
        status: 500
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      path: thumbPath
    }), {
      status: 200
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      error: "unexpected",
      details: String(err)
    }), {
      status: 500
    });
  }
});
