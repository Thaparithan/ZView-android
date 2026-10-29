import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const ANDROID_DIR = path.resolve(process.cwd(), 'android');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const OUT_ZIP = path.resolve(PUBLIC_DIR, 'zview-android-project.zip');
const OUT_TS = path.resolve(process.cwd(), 'src/data/androidProjectManifest.ts');

function walkFiles(dir: string, baseDir: string): { relativePath: string; content: string }[] {
  const results: { relativePath: string; content: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, baseDir));
    } else {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');
      results.push({ relativePath: rel, content });
    }
  }
  return results;
}

async function main() {
  const files = walkFiles(ANDROID_DIR, ANDROID_DIR);
  const zip = new JSZip();
  const rootFolder = zip.folder('ZView-Android-Studio');

  for (const file of files) {
    rootFolder?.file(file.relativePath, file.content);
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(OUT_ZIP, zipBuffer);

  fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
  const tsContent = `// Auto-generated from /android native Android Studio project files\nexport interface AndroidSourceFile {\n  path: string;\n  language: 'kotlin' | 'xml' | 'gradle' | 'toml' | 'markdown' | 'properties';\n  content: string;\n}\n\nexport const ANDROID_PROJECT_FILES: AndroidSourceFile[] = ${JSON.stringify(
    files.map((f) => {
      let language: 'kotlin' | 'xml' | 'gradle' | 'toml' | 'markdown' | 'properties' = 'properties';
      if (f.relativePath.endsWith('.kt')) language = 'kotlin';
      else if (f.relativePath.endsWith('.xml')) language = 'xml';
      else if (f.relativePath.endsWith('.kts')) language = 'gradle';
      else if (f.relativePath.endsWith('.toml')) language = 'toml';
      else if (f.relativePath.endsWith('.md')) language = 'markdown';
      return {
        path: f.relativePath,
        language,
        content: f.content,
      };
    }),
    null,
    2
  )};\n`;

  fs.writeFileSync(OUT_TS, tsContent, 'utf8');
  console.log(`Bundled ${files.length} Android Studio files into ${OUT_ZIP} (${zipBuffer.length} bytes) and ${OUT_TS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
